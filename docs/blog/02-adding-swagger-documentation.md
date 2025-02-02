# Adding Swagger Documentation to Your NestJS API

## Introduction

In this guide, we'll add comprehensive API documentation using Swagger/OpenAPI to our hierarchical structures API. This will make our API more accessible and easier to understand for other developers.

## Setting Up Swagger

### 1. Install Dependencies

```bash
npm install @nestjs/swagger swagger-ui-express
```

### 2. Configure Swagger in Main.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle(process.env.SWAGGER_TITLE || 'Hierarchical Structures API')
    .setDescription(
      process.env.SWAGGER_DESCRIPTION ||
        'API for managing hierarchical structures and permissions',
    )
    .setVersion(process.env.SWAGGER_VERSION || '1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Structures', 'Hierarchical structure management')
    .addTag('Users', 'User management')
    .addTag('Permissions', 'Permission management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(process.env.SWAGGER_PATH || 'api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(3000);
}
bootstrap();
```

### 3. Document DTOs

```typescript
// src/structures/dto/create-structure.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

export class CreateStructureDto {
  @ApiProperty({
    description: 'The name of the structure',
    example: 'Engineering Department',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'The ID of the parent structure',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the structure',
    example: {
      description: 'Main engineering department',
      employeeCount: 150,
      location: 'Building A',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
```

### 4. Document Entities

```typescript
// src/structures/entities/structure.entity.ts
import { ApiProperty } from '@nestjs/swagger';

@Entity('structures')
export class Structure {
  @ApiProperty({
    description: 'The unique identifier of the structure',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'The name of the structure',
    example: 'Engineering Department',
  })
  @Column()
  @Index()
  name: string;

  @ApiProperty({
    description: 'The ID of the parent structure',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @Column({ nullable: true })
  @Index()
  parentId: string;

  @ApiProperty({
    description: 'Additional metadata for the structure',
    example: {
      description: 'Main engineering department',
      employeeCount: 150,
      location: 'Building A',
    },
  })
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'The creation timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'The last update timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 5. Document Controllers

```typescript
// src/structures/structures.controller.ts
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Structures')
@ApiBearerAuth()
@Controller('structures')
export class StructuresController {
  @Post()
  @ApiOperation({ summary: 'Create a new structure' })
  @ApiResponse({
    status: 201,
    description: 'The structure has been successfully created.',
    type: Structure,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() createStructureDto: CreateStructureDto) {
    return this.structuresService.create(createStructureDto);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Get all descendants of a structure' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the structure',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    description: 'Maximum depth level to retrieve',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'List of descendant structures',
    type: [Structure],
  })
  getDescendants(@Param('id') id: string, @Query('level') level?: number) {
    return this.structuresService.findDescendants(id, level);
  }
}
```

### 6. Document Authentication

```typescript
// src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'StrongP@ssw0rd',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}

// src/auth/auth.controller.ts
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: 'JWT access token',
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

### 7. Add Response Interfaces

```typescript
// src/common/interfaces/api-response.interface.ts
export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

// Usage in controller
@ApiResponse({
  status: 200,
  description: 'Success',
  type: () => ApiResponse<Structure>,
})
```

### 8. Document Error Responses

```typescript
// src/common/dto/error.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponse {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Invalid input data',
  })
  message: string;

  @ApiProperty({
    description: 'Error details',
    example: ['name must be a string', 'parentId must be a UUID'],
  })
  errors?: string[];
}

// Usage in controller
@ApiResponse({
  status: 400,
  description: 'Bad Request',
  type: ErrorResponse,
})
```

## Security Schemas

```typescript
// src/common/decorators/api-security.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';

export function ApiAuth() {
  return applyDecorators(ApiBearerAuth(), ApiSecurity('csrf'));
}
```

## Custom Decorators for Documentation

```typescript
// src/common/decorators/api-paginated-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  totalItems: {
                    type: 'number',
                    example: 100,
                  },
                  itemCount: {
                    type: 'number',
                    example: 10,
                  },
                  itemsPerPage: {
                    type: 'number',
                    example: 10,
                  },
                  totalPages: {
                    type: 'number',
                    example: 10,
                  },
                  currentPage: {
                    type: 'number',
                    example: 1,
                  },
                },
              },
            },
          },
        ],
      },
    }),
  );
};
```

## Testing Swagger Documentation

1. Start your application
2. Visit `http://localhost:3000/api` to see the Swagger UI
3. Test endpoints directly from the UI
4. Verify all parameters and responses are correctly documented

## Best Practices

1. **Consistent Documentation**

   - Document all endpoints
   - Include example values
   - Provide clear descriptions

2. **Group Related Endpoints**

   - Use appropriate tags
   - Organize endpoints logically

3. **Security**

   - Document authentication requirements
   - Include authorization scopes
   - Show required headers

4. **Response Examples**
   - Provide realistic example data
   - Include error responses
   - Document all possible status codes

## Additional Tips

1. **Environment Configuration**

```typescript
// src/config/swagger.config.ts
export const swaggerConfig = {
  title: process.env.SWAGGER_TITLE,
  description: process.env.SWAGGER_DESCRIPTION,
  version: process.env.SWAGGER_VERSION,
  path: process.env.SWAGGER_PATH,
};
```

2. **Custom Theme**

```typescript
SwaggerModule.setup('api', app, document, {
  customSiteTitle: 'API Documentation',
  customfavIcon: '/favicon.ico',
  customCss: '.swagger-ui .topbar { display: none }',
});
```

3. **API Versioning**

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  prefix: 'v',
});
```

Remember to keep your Swagger documentation up-to-date as your API evolves. Good documentation is crucial for API adoption and developer experience.
