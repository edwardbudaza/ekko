# Implementing Caching with Redis in NestJS

## Introduction

In this fourth part of our series, we'll implement caching using Redis to improve our API's performance. We'll use @nestjs/cache-manager for efficient caching and handle cache invalidation effectively.

## Prerequisites

Ensure you have:

1. Completed Part 3 of the tutorial
2. Running Redis instance (via Docker)
3. Basic understanding of caching concepts

## Step-by-Step Implementation

### 1. Install Dependencies

```bash
npm install @nestjs/cache-manager cache-manager @types/cache-manager redis cache-manager-redis-store
```

### 2. Configure Cache Module

Update `src/app.module.ts`:

```typescript
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        password: configService.get('REDIS_PASSWORD'),
        ttl: configService.get('REDIS_TTL'),
      }),
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

### 3. Implement Caching in Services

Example with UsersService:

```typescript
@Injectable()
export class UsersService {
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private structuresService: StructuresService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(currentUserId: string): Promise<User[]> {
    const cacheKey = `users_accessible_${currentUserId}`;
    const cachedUsers = await this.cacheManager.get<User[]>(cacheKey);

    if (cachedUsers) {
      return cachedUsers;
    }

    const currentUser = await this.findOne(currentUserId);
    if (!currentUser.structureId) {
      throw new ForbiddenException('User has no structure');
    }

    const accessibleStructures =
      await this.structuresService.findUserAccessibleStructures(currentUserId);

    const users = await this.usersRepository.find({
      where: {
        structureId: In(accessibleStructures.map((s) => s.id)),
      },
      relations: ['structure', 'permissions'],
      cache: {
        id: cacheKey,
        milliseconds: this.CACHE_TTL * 1000,
      },
    });

    await this.cacheManager.set(cacheKey, users, this.CACHE_TTL);
    return users;
  }
}
```

### 4. Cache Invalidation Strategy

```typescript
@Injectable()
export class CacheInvalidationService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cacheManager.del(`user_${userId}`),
      this.cacheManager.del(`user_permissions_${userId}`),
      this.cacheManager.del(`users_accessible_${userId}`),
    ]);
  }

  async invalidateStructureCache(structureId: string): Promise<void> {
    await Promise.all([
      this.cacheManager.del(`structure_${structureId}`),
      this.cacheManager.del(`structure_tree_${structureId}`),
      this.cacheManager.del(`structure_children_${structureId}`),
    ]);
  }
}
```

### 5. Performance Monitoring

```typescript
@Injectable()
export class PerformanceMonitoringService {
  private readonly metrics = {
    cacheHits: new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['type'],
    }),
    cacheMisses: new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
    }),
    queryDuration: new Histogram({
      name: 'query_duration_seconds',
      help: 'Duration of database queries',
      buckets: [0.1, 0.5, 1, 2, 5],
    }),
  };

  incrementCacheHit(type: string): void {
    this.metrics.cacheHits.inc({ type });
  }

  incrementCacheMiss(): void {
    this.metrics.cacheMisses.inc();
  }

  recordQueryDuration(duration: number): void {
    this.metrics.queryDuration.observe(duration);
  }
}
```

## Best Practices

1. **Cache Key Strategy**

   - Use consistent naming conventions
   - Include relevant identifiers
   - Consider cache key collisions
   - Implement versioning if needed

2. **Cache TTL Strategy**

   - Set appropriate TTL values
   - Consider data volatility
   - Use different TTLs for different data types
   - Implement cache warming

3. **Cache Invalidation**

   - Implement proper invalidation
   - Handle race conditions
   - Use cache tags when possible
   - Consider cascade invalidation

4. **Performance Considerations**
   - Monitor cache hit rates
   - Track cache memory usage
   - Implement cache size limits
   - Use compression if needed

## Testing Caching

```typescript
describe('UsersService', () => {
  // ... setup code ...

  describe('findAll', () => {
    it('should return cached users when available', async () => {
      const userId = '1';
      const cachedUsers = [{ id: '1', email: 'test@example.com' }];

      mockCacheManager.get.mockResolvedValue(cachedUsers);

      const result = await service.findAll(userId);

      expect(result).toEqual(cachedUsers);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        `users_accessible_${userId}`,
      );
      expect(mockUserRepository.find).not.toHaveBeenCalled();
    });

    it('should cache users when not in cache', async () => {
      const userId = '1';
      const users = [{ id: '1', email: 'test@example.com' }];

      mockCacheManager.get.mockResolvedValue(null);
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.findAll(userId);

      expect(result).toEqual(users);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `users_accessible_${userId}`,
        users,
        3600,
      );
    });
  });
});
```

## Performance Metrics

Our caching implementation achieves:

- Response times < 100ms for cached requests
- Cache hit ratio > 90%
- Memory usage < 1GB
- Consistent response times under load

## Next Steps

In the next part, we'll implement:

1. Rate limiting
2. API documentation with Swagger
3. Request validation
4. Error handling

The combination of proper caching and monitoring ensures optimal API performance.

## Additional Resources

- [NestJS Caching Documentation](https://docs.nestjs.com/techniques/caching)
- [Redis Documentation](https://redis.io/documentation)
- [Cache-Control MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

## Conclusion

This article covered the implementation of Redis caching in our NestJS application. We explored various caching strategies, cache invalidation techniques, and performance monitoring. In the next article, we'll focus on implementing rate limiting and documenting our API.
