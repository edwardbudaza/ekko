# Getting Started with NestJS Hierarchical Structures API

## Introduction

In this first part of our series, we'll set up our NestJS project and implement the basic structure. We'll create a robust foundation for our hierarchical structures API, focusing on proper project organization and best practices.

## Project Setup

### 1. Create the Project

First, ensure you've completed all steps in the prerequisites guide. Then:

```bash
# Create a new directory for your project
mkdir challenge-ekko
cd challenge-ekko

# Initialize a new NestJS project
nest new . # Choose 'npm' when prompted

# Install additional required dependencies
npm install @nestjs/typeorm typeorm pg @nestjs/config
npm install @nestjs/swagger swagger-ui-express
npm install class-validator class-transformer
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/cache-manager cache-manager
npm install redis cache-manager-redis-store
```

### 2. Set Up Project Structure

Create the following directory structure:

```bash
mkdir -p src/{auth,config,structures,users,health}
mkdir -p src/common/{decorators,filters,guards,interceptors}
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# .env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_DATABASE=ekko

# JWT Configuration
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123
REDIS_TTL=3600
```

### 4. Create Docker Configuration

Create a `docker-compose.yml` file in the root directory:

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=postgres
      - DB_PASSWORD=postgres123
      - DB_DATABASE=ekko
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=redis123
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:13
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: ekko
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6
    ports:
      - '6379:6379'
    command: redis-server --requirepass redis123
    volumes:
      - redis_data:/data

  pgadmin:
    image: dpage/pgadmin4
    ports:
      - '5050:80'
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
```

Create a `Dockerfile` in the root directory:

```dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

### 5. Configure TypeORM

Create `src/config/database.config.ts`:

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
});
```

### 6. Update Main Application Module

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

### 7. Configure Swagger Documentation

Update `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Hierarchical Structures API')
    .setDescription('API for managing hierarchical structures')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
```

## Running the Application

Start the application using Docker Compose:

```bash
# Build and start all services
docker-compose up --build

# To run in detached mode
docker-compose up -d

# To view logs
docker-compose logs -f
```

Verify the setup by visiting:

- API Documentation: http://localhost:3000/api
- PgAdmin: http://localhost:5050 (login with admin@admin.com / admin)

## Understanding the Architecture

Our application follows a modular architecture:

1. **Modules**: Organize code into functional units

   - `AuthModule`: Handle authentication and authorization
   - `UsersModule`: Manage user accounts
   - `StructuresModule`: Handle hierarchical structures
   - `HealthModule`: Health checks and monitoring

2. **Layers**:
   - Controllers: Handle HTTP requests
   - Services: Implement business logic
   - Repositories: Handle database operations
   - Entities: Define data structures
   - DTOs: Define data transfer objects

## Next Steps

In the next article, we'll:

1. Create our database schema
2. Implement the structures module
3. Add basic CRUD operations

## Common Issues and Solutions

### Docker Issues

```bash
# If containers don't start properly
docker-compose down
docker-compose up --build

# If port conflicts occur
# Edit docker-compose.yml and change the port mappings
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up --build
```

## Additional Resources

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Homework

1. Try creating a simple entity and controller
2. Experiment with Swagger documentation
3. Practice using TypeORM queries
4. Explore NestJS decorators and pipes

Remember to commit your changes regularly:

```bash
git init
git add .
git commit -m "Initial project setup"
```

In the next article, we'll dive into database design and implementing our core structures module!
