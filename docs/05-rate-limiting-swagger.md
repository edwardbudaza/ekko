# Rate Limiting and API Documentation with Swagger

## Introduction

In this fifth part of our series, we'll implement rate limiting to protect our API from abuse and document our API using Swagger/OpenAPI. We'll cover setting up rate limiting with Redis, implementing various rate limiting strategies, and creating comprehensive API documentation.

## Rate Limiting Implementation

### Rate Limiting Module Setup

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get('THROTTLE_TTL'),
        limit: config.get('THROTTLE_LIMIT'),
        storage: new RedisThrottlerStorage({
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
        }),
      }),
    }),
  ],
})
export class RateLimitingModule {}
```

### Custom Rate Limiting Guard

```typescript
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(CACHE_MANAGER) protected cacheManager: Cache,
    protected readonly configService: ConfigService,
  ) {
    super();
  }

  protected async getTracker(req: Request): Promise<string> {
    const user = req.user as User;
    return user ? `${req.ip}-${user.id}` : req.ip;
  }

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tracker = await this.getTracker(request);
    const key = this.generateKey(context, tracker);

    const count = (await this.cacheManager.get<number>(key)) || 0;

    if (count >= limit) {
      throw new ThrottlerException();
    }

    await this.cacheManager.set(key, count + 1, ttl);
    return true;
  }
}
```

### Implementing Different Rate Limits

```typescript
@Injectable()
export class RateLimitService {
  private readonly limits = {
    FREE: { ttl: 60, limit: 30 },
    PREMIUM: { ttl: 60, limit: 100 },
    ENTERPRISE: { ttl: 60, limit: 500 },
  };

  getLimitForUser(user: User): { ttl: number; limit: number } {
    return this.limits[user.plan] || this.limits.FREE;
  }
}

@Controller('structures')
export class StructuresController {
  @Get()
  @UseGuards(CustomThrottlerGuard)
  @Throttle(30, 60) // Default rate limit
  @SetMetadata('throttler-skip', (req: Request) => {
    const user = req.user as User;
    return user?.plan === 'ENTERPRISE';
  })
  findAll() {
    return this.structuresService.findAll();
  }
}
```

## Swagger/OpenAPI Documentation

### Basic Swagger Setup

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Hierarchical Structures API')
    .setDescription(
      'API for managing hierarchical structures with authentication and caching',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
```

### Documenting DTOs

```typescript
export class CreateStructureDto {
  @ApiProperty({
    description: 'The name of the structure',
    example: 'Root Department',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The ID of the parent structure',
    example: 'uuid-v4',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
```

### Documenting Controllers

```typescript
@ApiTags('structures')
@Controller('structures')
@ApiBearerAuth()
export class StructuresController {
  @Post()
  @ApiOperation({ summary: 'Create a new structure' })
  @ApiResponse({
    status: 201,
    description: 'The structure has been successfully created.',
    type: StructureEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createStructureDto: CreateStructureDto) {
    return this.structuresService.create(createStructureDto);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Get structure descendants' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the structure',
    example: 'uuid-v4',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the descendants of the structure',
    type: [StructureEntity],
  })
  findDescendants(@Param('id') id: string) {
    return this.structuresService.findDescendants(id);
  }
}
```

### Documenting Entities

```typescript
@ApiTags('structures')
export class StructureEntity {
  @ApiProperty({
    description: 'The unique identifier of the structure',
    example: 'uuid-v4',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the structure',
    example: 'Engineering Department',
  })
  name: string;

  @ApiProperty({
    description: 'The ID of the parent structure',
    example: 'uuid-v4',
    required: false,
  })
  parentId?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-30T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-30T12:00:00Z',
  })
  updatedAt: Date;
}
```

## Security Schemas

```typescript
@ApiSecurity('bearer')
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: 'Login with credentials' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'user@example.com',
        },
        password: {
          type: 'string',
          example: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns JWT tokens',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
        },
        refresh_token: {
          type: 'string',
        },
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

## Rate Limit Headers

```typescript
@Injectable()
export class RateLimitHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const request = context.switchToHttp().getRequest();

        response.header('X-RateLimit-Limit', request.rateLimit.limit);
        response.header('X-RateLimit-Remaining', request.rateLimit.remaining);
        response.header('X-RateLimit-Reset', request.rateLimit.reset);
      }),
    );
  }
}
```

## Testing Rate Limiting

```typescript
describe('RateLimiting', () => {
  let app: INestApplication;
  let cacheManager: Cache;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    cacheManager = app.get<Cache>(CACHE_MANAGER);
    await app.init();
  });

  it('should block requests after limit is reached', async () => {
    const makeRequest = () => request(app.getHttpServer()).get('/structures');

    // Make requests up to the limit
    for (let i = 0; i < 30; i++) {
      await makeRequest().expect(200);
    }

    // Next request should be blocked
    await makeRequest().expect(429);
  });
});
```

## What's Next?

In Part 6, we'll explore implementing comprehensive testing strategies, including unit tests, integration tests, and end-to-end tests.

## Additional Resources

- [NestJS Rate Limiting Documentation](https://docs.nestjs.com/security/rate-limiting)
- [Swagger/OpenAPI Documentation](https://swagger.io/docs/)
- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)

## Conclusion

This article covered the implementation of rate limiting and API documentation in our NestJS application. We explored various rate limiting strategies and created comprehensive API documentation using Swagger/OpenAPI. In the next article, we'll focus on implementing thorough testing strategies for our application.
