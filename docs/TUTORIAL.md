# Building a Hierarchical RBAC System with NestJS - Tutorial

## Initial Setup

1. Create a new NestJS project:

```bash
nest new challenge-ekko
cd challenge-ekko
```

2. Install all required dependencies in one go:

```bash
npm install @nestjs/common @nestjs/core @nestjs/config @nestjs/typeorm @nestjs/passport @nestjs/jwt @nestjs/terminus @nestjs/cache-manager @nestjs/axios typeorm pg bcrypt class-validator class-transformer passport passport-jwt passport-local cache-manager cache-manager-redis-store ioredis @types/passport-jwt @types/passport-local @types/bcrypt @types/cache-manager
```

### Package Explanations

#### Core Packages

- `@nestjs/typeorm` & `typeorm`: ORM for database operations, specifically chosen for its closure table pattern support
- `@nestjs/cache-manager`: Redis caching implementation for performance optimization
- `@nestjs/terminus`: Health check endpoints with built-in indicators
- `@nestjs/config`: Environment configuration with validation

#### Security Packages

- `@nestjs/passport` & `passport`: Authentication middleware
- `@nestjs/jwt`: JWT token handling
- `bcrypt`: Password hashing
- `class-validator` & `class-transformer`: DTO validation and transformation

#### Database & Caching

- `pg`: PostgreSQL driver
- `cache-manager-redis-store`: Redis adapter for caching
- `ioredis`: Redis client with better TypeScript support

## Project Structure

```
src/
├── auth/                 # Authentication module
├── users/               # User management
├── structures/          # Organizational structure
├── health/             # Health monitoring
├── common/             # Shared utilities
└── config/             # Configuration
```

## Implementation Steps

1. **Database Setup**

   ```typescript
   // config/database.config.ts
   export const databaseConfig = {
     type: 'postgres',
     host: process.env.DB_HOST,
     port: parseInt(process.env.DB_PORT, 10),
     username: process.env.DB_USERNAME,
     password: process.env.DB_PASSWORD,
     database: process.env.DB_DATABASE,
     entities: ['dist/**/*.entity{.ts,.js}'],
     synchronize: process.env.NODE_ENV !== 'production',
     logging: process.env.NODE_ENV !== 'production',
   };
   ```

2. **Entity Design**

   ```typescript
   // structures/entities/structure.entity.ts
   @Entity()
   export class Structure {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @Column()
     name: string;

     @Tree('closure-table')
     @TreeChildren()
     children: Structure[];

     @TreeParent()
     parent: Structure;
   }
   ```

3. **Authentication Setup**

   ```typescript
   // auth/auth.module.ts
   @Module({
     imports: [
       PassportModule,
       JwtModule.registerAsync({
         useFactory: (config: ConfigService) => ({
           secret: config.get('JWT_SECRET'),
           signOptions: {
             expiresIn: config.get('JWT_EXPIRATION', '1h'),
           },
         }),
         inject: [ConfigService],
       }),
     ],
   })
   export class AuthModule {}
   ```

4. **Health Checks**
   ```typescript
   // health/health.module.ts
   @Module({
     imports: [TerminusModule, TypeOrmModule, CacheModule.register()],
     controllers: [HealthController],
     providers: [
       HealthService,
       SystemHealthIndicators,
       DatabaseHealthIndicators,
       CacheHealthIndicators,
     ],
   })
   export class HealthModule {}
   ```

## Key Features Implementation

### 1. Hierarchical Structure

The closure table pattern in TypeORM provides efficient tree operations:

```typescript
@Injectable()
export class StructuresService {
  async getDescendants(id: string): Promise<Structure[]> {
    return this.structureRepository
      .createDescendantsQueryBuilder('structure', 'structure_closure', id)
      .getMany();
  }
}
```

### 2. Role-Based Access

Custom decorators for role checks:

```typescript
// common/decorators/roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Implementation checks user's role and structure hierarchy
  }
}
```

### 3. Caching Strategy

```typescript
// users/users.service.ts
@Injectable()
export class UsersService {
  @CacheKey('user-structures')
  @CacheTTL(3600)
  async getUserStructures(userId: string): Promise<Structure[]> {
    // Implementation with caching
  }
}
```

## Docker Setup

1. Create Dockerfile:

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Non-root user for security
USER node
CMD ["npm", "run", "start:prod"]
```

2. Create docker-compose.yml:

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - '3000:3000'
    depends_on:
      - postgres
      - redis
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Testing Strategy

1. Unit Tests:

```typescript
// health/tests/health.service.spec.ts
describe('HealthService', () => {
  it('should check all health indicators', async () => {
    // Test implementation
  });
});
```

2. E2E Tests:

```typescript
// test/app.e2e-spec.ts
describe('AppController (e2e)', () => {
  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });
});
```

## Best Practices Implemented

1. **Security**

   - JWT with refresh tokens
   - Password hashing
   - Rate limiting
   - Non-root Docker user

2. **Performance**

   - Multi-stage Docker builds
   - Redis caching
   - Database indexing
   - Connection pooling

3. **Maintainability**

   - SOLID principles
   - Comprehensive testing
   - Clear documentation
   - Type safety

4. **Monitoring**
   - Health checks
   - Performance metrics
   - Error tracking
   - Logging
