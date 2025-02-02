# Comprehensive Testing Strategies in NestJS

## Introduction

In this sixth part of our series, we'll implement comprehensive testing strategies for our hierarchical structures API. We'll cover unit testing, integration testing, and end-to-end (e2e) testing, ensuring our application is robust and reliable.

## Unit Testing

### Testing Services

```typescript
describe('StructuresService', () => {
  let service: StructuresService;
  let repository: MockType<Repository<Structure>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StructuresService,
        {
          provide: getRepositoryToken(Structure),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<StructuresService>(StructuresService);
    repository = module.get(getRepositoryToken(Structure));
  });

  describe('create', () => {
    it('should create a structure', async () => {
      const createDto = {
        name: 'Test Structure',
        parentId: 'parent-uuid',
      };

      const expectedStructure = {
        id: 'uuid',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.create.mockReturnValue(expectedStructure);
      repository.save.mockResolvedValue(expectedStructure);

      const result = await service.create(createDto);
      expect(result).toEqual(expectedStructure);
    });

    it('should throw if parent not found', async () => {
      const createDto = {
        name: 'Test Structure',
        parentId: 'non-existent-uuid',
      };

      repository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

### Testing Guards and Interceptors

```typescript
describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;
  let cacheManager: MockType<Cache>;
  let configService: MockType<ConfigService>;

  beforeEach(() => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    guard = new CustomThrottlerGuard(cacheManager, configService);
  });

  it('should allow request within limit', async () => {
    const context = createMockExecutionContext();
    cacheManager.get.mockResolvedValue(5); // Below limit

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should block request exceeding limit', async () => {
    const context = createMockExecutionContext();
    cacheManager.get.mockResolvedValue(30); // At limit

    await expect(guard.canActivate(context)).rejects.toThrow(
      ThrottlerException,
    );
  });
});
```

## Integration Testing

### Testing Database Operations

```typescript
describe('StructuresRepository', () => {
  let repository: StructureRepository;
  let connection: Connection;

  beforeAll(async () => {
    connection = await createTestingConnection();
    repository = connection.getCustomRepository(StructureRepository);
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    await repository.clear();
  });

  describe('findDescendants', () => {
    it('should find all descendants', async () => {
      // Create test hierarchy
      const root = await repository.save({
        name: 'Root',
      });

      const child1 = await repository.save({
        name: 'Child 1',
        parentId: root.id,
      });

      const grandChild = await repository.save({
        name: 'Grandchild',
        parentId: child1.id,
      });

      const descendants = await repository.findDescendants(root.id);

      expect(descendants).toHaveLength(2);
      expect(descendants.map((d) => d.id)).toContain(child1.id);
      expect(descendants.map((d) => d.id)).toContain(grandChild.id);
    });
  });
});
```

### Testing Cache Integration

```typescript
describe('CacheService Integration', () => {
  let cacheService: CacheService;
  let redisClient: Redis;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.registerAsync({
          useFactory: () => ({
            store: redisStore,
            host: 'localhost',
            port: 6379,
          }),
        }),
      ],
      providers: [CacheService],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
    redisClient = module.get<Cache>(CACHE_MANAGER).store.getClient();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(async () => {
    await redisClient.flushall();
  });

  it('should cache and retrieve values', async () => {
    const key = 'test-key';
    const value = { id: 1, name: 'Test' };

    await cacheService.set(key, value);
    const cached = await cacheService.get(key);

    expect(cached).toEqual(value);
  });
});
```

## End-to-End Testing

### API Testing Setup

```typescript
describe('Structures (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get JWT token for authenticated requests
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    jwtToken = response.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/structures (POST)', () => {
    it('should create a structure', () => {
      return request(app.getHttpServer())
        .post('/structures')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: 'Test Structure',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test Structure');
        });
    });

    it('should validate input', () => {
      return request(app.getHttpServer())
        .post('/structures')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: '', // Invalid empty name
        })
        .expect(400);
    });
  });
});
```

### Testing Complex Scenarios

```typescript
describe('Structure Hierarchy (e2e)', () => {
  it('should handle complex hierarchy operations', async () => {
    // Create root structure
    const rootResponse = await request(app.getHttpServer())
      .post('/structures')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ name: 'Root' })
      .expect(201);

    const rootId = rootResponse.body.id;

    // Create child structure
    const childResponse = await request(app.getHttpServer())
      .post('/structures')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Child',
        parentId: rootId,
      })
      .expect(201);

    const childId = childResponse.body.id;

    // Verify descendants
    const descendantsResponse = await request(app.getHttpServer())
      .get(`/structures/${rootId}/descendants`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(descendantsResponse.body).toHaveLength(1);
    expect(descendantsResponse.body[0].id).toBe(childId);

    // Test moving structures
    await request(app.getHttpServer())
      .put(`/structures/${childId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        parentId: null, // Move to root level
      })
      .expect(200);

    // Verify updated hierarchy
    const updatedDescendants = await request(app.getHttpServer())
      .get(`/structures/${rootId}/descendants`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(updatedDescendants.body).toHaveLength(0);
  });
});
```

## Test Utilities and Helpers

```typescript
export class TestUtils {
  static async createTestingModule(options: {
    imports?: any[];
    providers?: any[];
  }) {
    const module: TestingModule = await Test.createTestingModule({
      imports: options.imports || [],
      providers: options.providers || [],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    return { module, app };
  }

  static createMockRepository() {
    return {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
  }

  static async generateTestToken(
    app: INestApplication,
    user: Partial<User>,
  ): Promise<string> {
    const authService = app.get<AuthService>(AuthService);
    const { access_token } = await authService.login(user as User);
    return access_token;
  }
}
```

## Test Coverage and Quality

```typescript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## What's Next?

In Part 7, we'll explore implementing logging, monitoring, and error tracking to ensure our application is production-ready.

## Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

## Conclusion

This article covered comprehensive testing strategies for our NestJS application. We explored unit testing, integration testing, and end-to-end testing, ensuring our application is thoroughly tested and reliable. In the next article, we'll focus on implementing logging, monitoring, and error tracking systems.
