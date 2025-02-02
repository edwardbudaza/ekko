# Advanced Features and Optimizations in NestJS

## Introduction

In this final part of our series, we'll implement advanced features and optimizations to enhance our hierarchical structures API. We'll cover performance optimizations, advanced caching strategies, database optimizations, and implementing WebSocket support for real-time updates.

## Performance Optimizations

### Response Compression

```typescript
@Module({
  imports: [
    CompressionModule.register({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024,
      encodings: ['gzip', 'deflate'],
    }),
  ],
})
export class AppModule {}
```

### Response Streaming

```typescript
@Controller('structures')
export class StructuresController {
  @Get('export')
  async exportStructures(@Res() response: Response) {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Transfer-Encoding', 'chunked');

    const stream = new Readable({
      read() {},
      objectMode: true,
    });

    stream.pipe(JSONStream.stringify()).pipe(response);

    const batchSize = 100;
    let skip = 0;

    while (true) {
      const structures = await this.structuresService.findBatch(
        skip,
        batchSize,
      );

      if (structures.length === 0) {
        break;
      }

      for (const structure of structures) {
        stream.push(structure);
      }

      skip += batchSize;
    }

    stream.push(null);
  }
}
```

## Advanced Caching Strategies

### Multi-Level Caching

```typescript
@Injectable()
export class MultiLevelCacheService {
  private readonly localCache = new Map<string, any>();
  private readonly localTTL = 60 * 1000; // 1 minute

  constructor(
    @Inject(CACHE_MANAGER) private redisCacheManager: Cache,
    private configService: ConfigService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Check local cache first
    const localValue = this.getFromLocalCache<T>(key);
    if (localValue) {
      return localValue;
    }

    // Check Redis cache
    const redisValue = await this.redisCacheManager.get<T>(key);
    if (redisValue) {
      this.setInLocalCache(key, redisValue);
      return redisValue;
    }

    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Set in both caches
    this.setInLocalCache(key, value);
    await this.redisCacheManager.set(
      key,
      value,
      ttl || this.configService.get('REDIS_TTL'),
    );
  }

  private getFromLocalCache<T>(key: string): T | null {
    const entry = this.localCache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > this.localTTL) {
      this.localCache.delete(key);
      return null;
    }

    return entry.value;
  }

  private setInLocalCache(key: string, value: any): void {
    this.localCache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }
}
```

## Database Optimizations

### Query Optimization

```typescript
@Injectable()
export class StructuresService {
  constructor(
    @InjectRepository(Structure)
    private structureRepository: Repository<Structure>,
  ) {}

  async findDescendantsOptimized(id: string): Promise<Structure[]> {
    return this.structureRepository
      .createQueryBuilder('structure')
      .select([
        'structure.id',
        'structure.name',
        'structure.parentId',
        'structure.createdAt',
      ])
      .withRecursive('structure_tree', {
        expression: `
          WITH RECURSIVE structure_tree AS (
            SELECT
              id,
              name,
              "parentId",
              ARRAY[id] as path,
              1 as level
            FROM structure
            WHERE id = :id
            
            UNION ALL
            
            SELECT
              s.id,
              s.name,
              s."parentId",
              st.path || s.id,
              st.level + 1
            FROM structure s
            INNER JOIN structure_tree st ON s."parentId" = st.id
            WHERE NOT s.id = ANY(st.path)
          )
          SELECT * FROM structure_tree
        `,
      })
      .setParameter('id', id)
      .orderBy('level', 'ASC')
      .addOrderBy('name', 'ASC')
      .cache(true)
      .getRawMany();
  }
}
```

### Database Indexing

```typescript
@Entity()
export class Structure {
  @Index()
  @Column()
  parentId: string;

  @Index()
  @Column()
  name: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @Index({ spatial: true })
  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: Point;
}
```

## WebSocket Implementation

### WebSocket Gateway

```typescript
@WebSocketGateway({
  namespace: 'structures',
  cors: true,
})
export class StructuresGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly connectedClients = new Map<string, Socket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: CustomLogger,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);

      this.connectedClients.set(client.id, client);
      client.join(`user-${payload.sub}`);

      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('watchStructure')
  async handleWatchStructure(
    @MessageBody() data: { structureId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    client.join(`structure-${data.structureId}`);
  }

  @SubscribeMessage('unwatchStructure')
  async handleUnwatchStructure(
    @MessageBody() data: { structureId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    client.leave(`structure-${data.structureId}`);
  }

  notifyStructureUpdated(structureId: string, data: any): void {
    this.server.to(`structure-${structureId}`).emit('structureUpdated', data);
  }
}
```

### Real-time Updates Integration

```typescript
@Injectable()
export class StructuresService {
  constructor(private readonly structuresGateway: StructuresGateway) {}

  async update(id: string, updateDto: UpdateStructureDto): Promise<Structure> {
    const structure = await this.structureRepository.findOne(id);
    if (!structure) {
      throw new NotFoundException('Structure not found');
    }

    Object.assign(structure, updateDto);
    const updated = await this.structureRepository.save(structure);

    // Notify connected clients
    this.structuresGateway.notifyStructureUpdated(id, updated);

    return updated;
  }
}
```

## Advanced Search Implementation

### Elasticsearch Integration

```typescript
@Injectable()
export class SearchService {
  constructor(
    @ElasticsearchService
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async indexStructure(structure: Structure): Promise<void> {
    await this.elasticsearchService.index({
      index: 'structures',
      id: structure.id,
      body: {
        name: structure.name,
        parentId: structure.parentId,
        createdAt: structure.createdAt,
        location: structure.location,
        metadata: structure.metadata,
      },
    });
  }

  async search(query: string): Promise<SearchResult[]> {
    const { body } = await this.elasticsearchService.search({
      index: 'structures',
      body: {
        query: {
          multi_match: {
            query,
            fields: ['name^3', 'metadata.*'],
            fuzziness: 'AUTO',
          },
        },
        sort: [{ _score: 'desc' }, { createdAt: 'desc' }],
      },
    });

    return body.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
    }));
  }
}
```

## Performance Monitoring

### Custom Metrics Collection

```typescript
@Injectable()
export class PerformanceMetricsService {
  private readonly metrics = new Map<string, Histogram>();

  constructor(private readonly prometheusService: PrometheusService) {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set(
      'db_query_duration',
      new Histogram({
        name: 'db_query_duration_seconds',
        help: 'Database query duration in seconds',
        labelNames: ['query_type'],
        buckets: [0.1, 0.5, 1, 2, 5],
      }),
    );

    this.metrics.set(
      'cache_hit_ratio',
      new Gauge({
        name: 'cache_hit_ratio',
        help: 'Cache hit ratio',
        labelNames: ['cache_type'],
      }),
    );

    this.metrics.forEach((metric) => {
      this.prometheusService.registerMetric(metric);
    });
  }

  recordQueryDuration(queryType: string, duration: number): void {
    this.metrics
      .get('db_query_duration')
      .observe({ query_type: queryType }, duration);
  }

  updateCacheHitRatio(cacheType: string, ratio: number): void {
    this.metrics.get('cache_hit_ratio').set({ cache_type: cacheType }, ratio);
  }
}
```

## API Documentation

### OpenAPI Enhancement

```typescript
@ApiTags('structures')
@Controller('structures')
export class StructuresController {
  @Post()
  @ApiOperation({
    summary: 'Create a new structure',
    description: 'Creates a new structure in the hierarchy',
  })
  @ApiBody({ type: CreateStructureDto })
  @ApiResponse({
    status: 201,
    description: 'The structure has been successfully created.',
    type: StructureResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
    type: ValidationErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    type: UnauthorizedErrorResponse,
  })
  async create(
    @Body() createStructureDto: CreateStructureDto,
  ): Promise<StructureResponseDto> {
    return this.structuresService.create(createStructureDto);
  }
}
```

## What's Next?

This concludes our 10-part series on building a production-ready hierarchical structures API with NestJS. You now have a robust, secure, and performant application that can handle complex hierarchical data structures with features like:

- Authentication and Authorization
- Caching and Rate Limiting
- Comprehensive Testing
- Logging and Monitoring
- Security Hardening
- Advanced Features and Optimizations

## Additional Resources

- [NestJS Performance Tips](https://docs.nestjs.com/techniques/performance)
- [WebSocket Documentation](https://docs.nestjs.com/websockets/gateways)
- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)

## Conclusion

Throughout this series, we've built a comprehensive, production-ready API that demonstrates best practices in modern Node.js development. The application is now equipped with advanced features, optimizations, and monitoring capabilities that make it suitable for production deployment and scalable use.
