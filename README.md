# Ekko Challenge - Hierarchical Role-Based Access Control

## Overview

A NestJS application implementing hierarchical role-based permission management, allowing groups of users to access other users' information based on their roles within the organization.

## Architecture Decisions

### Technology Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport
- **Caching**: In-memory cache with @nestjs/cache-manager
- **API Style**: REST
- **Container**: Docker with docker-compose

### Key Design Patterns

1. **Repository Pattern**: Using TypeORM repositories for data access
2. **Dependency Injection**: NestJS's built-in DI container
3. **Guard Pattern**: For authentication and authorization
4. **Decorator Pattern**: For role-based access control
5. **Tree Structure**: Using closure table pattern for hierarchical data

### Database Design

- Hierarchical structure using closure table pattern
- Optimized queries for ancestor/descendant lookups
- Proper indexing for performance
- Soft delete for data retention

## Setup

### Prerequisites

- Node.js (v16+)
- Docker and Docker Compose
- PostgreSQL (if running locally)

### Environment Setup

1. Clone the repository
2. Copy environment file:

```bash
cp .env.example .env
```

3. Update environment variables as needed

### Running with Docker

```bash
# Start PostgreSQL and pgAdmin
docker-compose up -d

# Install dependencies
npm install

# Start application in development mode
npm run start:dev
```

### Database Access

- PostgreSQL: localhost:5433
- pgAdmin: localhost:5050

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
- Password hashing with bcrypt
- Request validation
- Rate limiting
- Environment variable protection

## Performance Optimizations

- Database query optimization
- Response caching
- Proper indexing
- Connection pooling
- Tree structure optimization

## Health Checks

The application includes comprehensive health monitoring following SOLID principles:

### Endpoints

- `GET /health`: Returns the overall health status of the application

### Monitored Services

- Database connectivity
- Redis cache
- System memory usage
- Disk storage

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
```

### Testing

Comprehensive test suite includes:

- Unit tests for health indicators
- Integration tests for the health service
- E2E tests for the health endpoint

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT
