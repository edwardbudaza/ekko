# Ekko Challenge - Hierarchical Role-Based Access Control

## Overview

A NestJS application implementing hierarchical role-based permission management, allowing groups of users to access other users' information based on their roles and permissions within the organization.

For a detailed step-by-step guide on how to build this project from scratch, see our [Tutorial](/TUTORIAL.md).

## Architecture Decisions

### Technology Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport
- **Caching**: Redis with @nestjs/cache-manager
- **API Style**: REST with Swagger/OpenAPI
- **Container**: Docker with docker-compose

### Key Design Patterns

1. **Repository Pattern**: Using TypeORM repositories for data access
2. **Dependency Injection**: NestJS's built-in DI container
3. **Guard Pattern**: For authentication and authorization
4. **Decorator Pattern**: For role-based access control
5. **Tree Structure**: Using closure table pattern for hierarchical data
6. **Cache-Aside Pattern**: For efficient data caching

### Database Design

- Hierarchical structure using closure table pattern
- Granular permission system with user-structure relationships
- Optimized queries for ancestor/descendant lookups
- Proper indexing for performance
- Soft delete for data retention

## Setup

### Prerequisites

- Node.js (v16+)
- Docker and Docker Compose
- PostgreSQL (if running locally)
- Redis (if running locally)

### Environment Setup

1. Clone the repository
2. Copy environment file:

```bash
cp .env.example .env
```

3. Update environment variables as needed

### Running with Docker

```bash
# Start PostgreSQL, Redis, and pgAdmin
docker-compose up -d

# Install dependencies
npm install

# Run database migrations
npm run migration:run

# Start application in development mode
npm run start:dev
```

## Using the API with Swagger

### Accessing Swagger Documentation

1. After starting the application, open your browser and navigate to:
   ```
   http://localhost:3000/api
   ```

### Authentication Steps

1. **Register Initial Admin User**

   - Expand the `Auth` section in Swagger
   - Find `POST /auth/register`
   - Click "Try it out"
   - Use this sample request:

   ```json
   {
     "email": "admin@example.com",
     "password": "Admin123!",
     "firstName": "Admin",
     "lastName": "User",
     "role": "admin"
   }
   ```

   - Click "Execute"
   - Save the `access_token` from the response

2. **Login**

   - Find `POST /auth/login`
   - Click "Try it out"
   - Enter credentials:

   ```json
   {
     "email": "admin@example.com",
     "password": "Admin123!"
   }
   ```

   - Click "Execute"
   - Copy the `access_token`

3. **Authorize in Swagger**
   - Click the "Authorize" button at the top
   - Enter token as: `Bearer your_access_token`
   - Click "Authorize"

Now you can use all other API endpoints with proper authentication!

### Service Access

- Application: http://localhost:3000
- Swagger UI: http://localhost:3000/api
- PostgreSQL: localhost:5433
- pgAdmin: localhost:5050
- Redis: localhost:6379

## API Documentation

### Authentication

```http
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### User Management

```http
# Create user (National role required)
POST /users

# Get users (filtered by structure access)
GET /users

# Get specific user
GET /users/:id

# Update user
PUT /users/:id

# Delete user (National role required)
DELETE /users/:id
```

### Structure Management

```http
# Create structure
POST /structures

# Get structures
GET /structures

# Get structure descendants
GET /structures/:id/descendants

# Get structure permissions
GET /structures/:id/permissions
```

### Permission Management

```http
# Grant permission
POST /permissions
{
  "userId": "uuid",
  "structureId": "uuid",
  "metadata": {}
}

# Revoke permission
DELETE /permissions/:id
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Security Features

- JWT-based authentication
- Role-based access control
- Granular permission system
- Password hashing with bcrypt
- Request validation
- Rate limiting
- Environment variable protection
- CORS configuration

## Performance Optimizations

- Redis caching with @nestjs/cache-manager
- Database query optimization
- Proper indexing
- Connection pooling
- Tree structure optimization
- Cache invalidation strategies
- Performance monitoring metrics

## Health Checks

The application includes comprehensive health monitoring:

### Endpoints

- `GET /health`: Returns the overall health status

### Monitored Services

- Database connectivity
- Redis cache
- System memory usage
- Disk storage
- Cache hit rates
- Query performance

### Architecture

The health module follows SOLID principles:

- **Single Responsibility**: Each health indicator is responsible for one type of check
- **Open/Closed**: New health indicators can be added without modifying existing code
- **Liskov Substitution**: All health indicators implement the `IHealthIndicator` interface
- **Interface Segregation**: Clean separation between health checks and business logic
- **Dependency Inversion**: Services depend on abstractions, not concrete implementations

### Configuration

Health check thresholds can be configured via environment variables:

```env
MEMORY_HEAP_LIMIT_MB=150
DISK_THRESHOLD_PERCENT=0.9
REDIS_TTL=3600
```

### Monitoring

- Cache hit/miss metrics
- Query duration histograms
- Memory usage tracking
- Error rate monitoring

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT

## Using the API with Swagger UI

### Accessing Swagger Documentation

1. Start the application using Docker:

```bash
docker-compose up -d
```

2. Open your browser and navigate to: http://localhost:3000/api

### Authentication Steps

1. **Register a New User**

   - In Swagger UI, expand the `Auth` section
   - Find the `POST /auth/register` endpoint
   - Click "Try it out"
   - Enter the registration details in the request body:

   ```json
   {
     "email": "admin@example.com",
     "password": "Admin123!",
     "firstName": "Admin",
     "lastName": "User",
     "role": "admin"
   }
   ```

   - Click "Execute"
   - You will receive an access token in the response

2. **Login with Existing User**

   - In the `Auth` section, find `POST /auth/login`
   - Click "Try it out"
   - Enter your credentials:

   ```json
   {
     "email": "admin@example.com",
     "password": "Admin123!"
   }
   ```

   - Click "Execute"
   - Copy the `access_token` from the response

3. **Using the Access Token**
   - At the top of the Swagger UI, click the "Authorize" button
   - In the authorization popup, enter your token in the format: `Bearer your_token_here`
   - Click "Authorize"
   - All subsequent API requests will include your authentication token

### Managing Users

After authentication, you can:

1. **Create New Users** (Admin/National role required)

   - Expand the `Users` section
   - Use `POST /users` endpoint
   - Sample request body:

   ```json
   {
     "email": "user@example.com",
     "password": "User123!",
     "firstName": "Regular",
     "lastName": "User",
     "role": "city",
     "structureId": "uuid_of_structure"
   }
   ```

2. **View Users**

   - Use `GET /users` to list all accessible users
   - Use `GET /users/{id}` to view specific user details

3. **Update Users**

   - Use `PUT /users/{id}` to update user information
   - You can only update users within your structure hierarchy

4. **Delete Users** (Admin/National role required)
   - Use `DELETE /users/{id}` to remove a user

### Common Issues

1. **Authentication Errors**

   - Ensure password meets minimum requirements (at least 6 characters)
   - Check that email format is valid
   - Verify you're using the correct token format in authorization

2. **Permission Errors**
   - Verify you have the required role for the operation
   - Check that you have access to the target structure
   - Ensure your token hasn't expired
