# Prerequisites and Development Environment Setup

## Introduction

Welcome to our comprehensive guide on building a hierarchical structures API with NestJS! Before diving into the main tutorial, let's set up your development environment and understand the basic concepts.

## Required Knowledge

While this tutorial is designed for beginners, basic familiarity with these concepts will be helpful:

- JavaScript/TypeScript fundamentals
- Basic understanding of REST APIs
- Basic terminal/command line usage

Don't worry if you're not an expert in these areas - we'll explain concepts as we go along.

## Development Environment Setup

### 1. Install Node.js

First, install Node.js (version 18 or later):

1. Visit [Node.js official website](https://nodejs.org/)
2. Download and install the LTS version
3. Verify installation:

```bash
node --version
npm --version
```

### 2. Install Development Tools

Install these essential development tools:

```bash
# Install NestJS CLI globally
npm install -g @nestjs/cli

# Verify installation
nest --version

# Install Docker Desktop
# Visit: https://www.docker.com/products/docker-desktop
# Download and install for your operating system

# Verify Docker installation
docker --version
docker-compose --version
```

### 3. Code Editor Setup

1. Download and install [Visual Studio Code](https://code.visualstudio.com/)
2. Install recommended extensions:
   - ESLint
   - Prettier
   - Docker
   - TypeScript and JavaScript Language Features
   - NestJS Snippets

### 4. Database Tools

We'll be using PostgreSQL, so install these tools:

- [pgAdmin](https://www.pgadmin.org/download/) (for database management)
- [Postman](https://www.postman.com/downloads/) (for API testing)

## Understanding the Project Structure

Our project will follow this architecture:

```
challenge-ekko/
├── src/
│   ├── auth/           # Authentication module
│   ├── config/         # Configuration files
│   ├── structures/     # Main business logic
│   ├── users/          # User management
│   └── health/         # Health checks
├── test/               # Test files
├── docker/             # Docker configuration
└── docs/              # Documentation
```

### Key Technologies We'll Use

1. **NestJS**: A progressive Node.js framework

   - [Official Documentation](https://docs.nestjs.com/)
   - Key concepts: Modules, Controllers, Services, Pipes

2. **TypeORM**: Object-Relational Mapping for databases

   - [Documentation](https://typeorm.io/)
   - Handles database operations

3. **PostgreSQL**: Our primary database

   - [Official Documentation](https://www.postgresql.org/docs/)

4. **Redis**: For caching

   - [Documentation](https://redis.io/documentation)

5. **Docker**: For containerization
   - [Get Started Guide](https://docs.docker.com/get-started/)

## Initial Project Setup

Let's create our project structure:

```bash
# Create a new NestJS project
nest new challenge-ekko

# Navigate to project directory
cd challenge-ekko

# Install core dependencies
npm install @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata typescript

# Install development dependencies
npm install --save-dev @types/node @types/express @nestjs/testing jest ts-jest

# Install database dependencies
npm install @nestjs/typeorm typeorm pg

# Install utility dependencies
npm install @nestjs/config class-validator class-transformer

# Create basic folder structure
mkdir -p src/{auth,config,structures,users,health}
```

## Verify Setup

Test your setup by running:

```bash
# Start the development server
npm run start:dev

# You should see output indicating the server is running on port 3000
```

Visit `http://localhost:3000` in your browser. You should see a "Hello World" message.

## Understanding NestJS Basics

Before proceeding, familiarize yourself with these core NestJS concepts:

1. **Modules**: Organize application structure

```typescript
@Module({
  imports: [], // Import other modules
  controllers: [], // Handle HTTP requests
  providers: [], // Services, repositories, etc.
})
export class AppModule {}
```

2. **Controllers**: Handle incoming requests

```typescript
@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return 'This returns all users';
  }
}
```

3. **Services**: Implement business logic

```typescript
@Injectable()
export class UsersService {
  findAll() {
    return 'Business logic here';
  }
}
```

## Next Steps

In the next article, we'll:

1. Set up our database configuration
2. Create our first module
3. Implement basic CRUD operations

## Additional Resources

- [TypeScript Official Documentation](https://www.typescriptlang.org/docs/)
- [NestJS Fundamentals Course](https://learn.nestjs.com/)
- [Docker Curriculum](https://docker-curriculum.com/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)

## Troubleshooting Common Issues

### Node.js Installation Issues

- Windows: Ensure you're running PowerShell as administrator
- Linux: Use nvm (Node Version Manager) for easier version management
- Mac: Use Homebrew for installation: `brew install node`

### Docker Issues

- Ensure Virtualization is enabled in BIOS
- Windows: WSL2 must be installed and enabled
- Linux: Add your user to the docker group

### PostgreSQL Connection Issues

- Check if PostgreSQL service is running
- Verify port 5432 is not in use
- Ensure database credentials are correct

## Getting Help

If you encounter issues:

1. Check the [NestJS Discord community](https://discord.gg/nestjs)
2. Visit [Stack Overflow](https://stackoverflow.com/questions/tagged/nestjs)
3. Review [GitHub Issues](https://github.com/nestjs/nest/issues)

Now that your environment is set up, you're ready to begin building the application in the next article!
