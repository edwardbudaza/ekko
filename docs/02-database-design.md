# Database Design and Core Structures

## Introduction

In this second part of our series, we'll design and implement the database schema for our hierarchical structures API. We'll create entities, set up repositories, and implement the core functionality for managing tree-like data structures with granular permissions.

## Prerequisites

Ensure you have:

1. Completed Part 1 of the tutorial
2. Running PostgreSQL instance (via Docker from Part 1)
3. Basic understanding of TypeORM and SQL concepts

## Step-by-Step Implementation

### 1. Create the Structure Entity

Create `src/structures/entities/structure.entity.ts`:

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('structures')
export class Structure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index() // Add index for better query performance
  name: string;

  @Column({ nullable: true })
  @Index() // Add index for better query performance
  parentId: string;

  @ManyToOne(() => Structure, (structure) => structure.children)
  @JoinColumn({ name: 'parentId' })
  parent: Structure;

  @OneToMany(() => Structure, (structure) => structure.parent)
  children: Structure[];

  @OneToMany(() => Permission, (permission) => permission.structure)
  permissions: Permission[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. Create the Permission Entity

Create `src/permissions/entities/permission.entity.ts`:

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Structure } from '../../structures/entities/structure.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.permissions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Structure)
  @JoinColumn({ name: 'structureId' })
  structure: Structure;

  @Column()
  structureId: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 3. Update the User Entity

Update `src/users/entities/user.entity.ts` to include permissions:

```typescript
@Entity('users')
export class User {
  // ... existing fields ...

  @OneToMany(() => Permission, (permission) => permission.user, {
    cascade: true,
    eager: true,
  })
  permissions: Permission[];

  // ... existing fields ...
}
```

### 4. Create Database Migration

Create a migration for the permissions table:

```typescript
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreatePermissionsTable1643673600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'structureId',
            type: 'uuid',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'permissions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'permissions',
      new TableForeignKey({
        columnNames: ['structureId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'structures',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('permissions');
    const foreignKeys = table.foreignKeys;

    await Promise.all(
      foreignKeys.map((foreignKey) =>
        queryRunner.dropForeignKey('permissions', foreignKey),
      ),
    );

    await queryRunner.dropTable('permissions');
  }
}
```

### 5. Implement Permission Service

Create `src/permissions/permissions.service.ts`:

```typescript
@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async grantPermission(
    userId: string,
    structureId: string,
    metadata?: Record<string, any>,
  ): Promise<Permission> {
    const permission = this.permissionsRepository.create({
      userId,
      structureId,
      metadata,
    });

    await this.permissionsRepository.save(permission);
    await this.cacheManager.del(`user_permissions_${userId}`);

    return permission;
  }

  async revokePermission(id: string): Promise<void> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.permissionsRepository.remove(permission);
    await this.cacheManager.del(`user_permissions_${permission.userId}`);
  }
}
```

## Database Schema Overview

Our final database schema includes:

1. **structures**: Hierarchical organization units

   - Self-referential relationship for parent/child
   - One-to-many relationship with permissions

2. **users**: Application users

   - One-to-many relationship with permissions
   - Role-based access control

3. **permissions**: Granular access control
   - Many-to-one relationship with users
   - Many-to-one relationship with structures
   - Metadata for flexible permission attributes

## Best Practices

1. **Indexing Strategy**

   - Index frequently queried columns
   - Use composite indexes for common query patterns
   - Consider query performance impact

2. **Relationship Management**

   - Use cascade operations appropriately
   - Implement proper foreign key constraints
   - Handle circular dependencies

3. **Data Integrity**

   - Use transactions for complex operations
   - Implement proper validation
   - Handle edge cases

4. **Performance Considerations**
   - Use eager loading judiciously
   - Implement proper caching strategies
   - Optimize query patterns

## Next Steps

In the next part, we'll implement authentication and authorization using these entities, focusing on:

1. JWT-based authentication
2. Role-based access control
3. Permission-based authorization
4. Security best practices

The combination of structures and permissions provides a flexible and secure foundation for our hierarchical API.

## Prerequisites

Ensure you have:

1. Completed Part 1 of the tutorial
2. Running PostgreSQL instance (via Docker from Part 1)
3. Basic understanding of TypeORM and SQL concepts

## Step-by-Step Implementation

### 1. Create the Structure Entity

Create `src/structures/entities/structure.entity.ts`:

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('structures')
export class Structure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index() // Add index for better query performance
  name: string;

  @Column({ nullable: true })
  @Index() // Add index for better query performance
  parentId: string;

  @ManyToOne(() => Structure, (structure) => structure.children)
  @JoinColumn({ name: 'parentId' })
  parent: Structure;

  @OneToMany(() => Structure, (structure) => structure.parent)
  children: Structure[];

  @OneToMany(() => Permission, (permission) => permission.structure)
  permissions: Permission[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. Create DTOs (Data Transfer Objects)

Create `src/structures/dto/create-structure.dto.ts`:

```typescript
import {
  IsString,
  IsOptional,
  IsUUID,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStructureDto {
  @ApiProperty({
    description: 'The name of the structure',
    example: 'Engineering Department',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The ID of the parent structure',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({
    description: 'Additional metadata for the structure',
    example: { description: 'Main engineering department', code: 'ENG-001' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
```

Create `src/structures/dto/update-structure.dto.ts`:

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateStructureDto } from './create-structure.dto';

export class UpdateStructureDto extends PartialType(CreateStructureDto) {}
```

### 3. Create the Structures Module

Create `src/structures/structures.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Structure } from './entities/structure.entity';
import { StructuresService } from './structures.service';
import { StructuresController } from './structures.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Structure])],
  providers: [StructuresService],
  controllers: [StructuresController],
  exports: [StructuresService],
})
export class StructuresModule {}
```

### 4. Implement the Service Layer

Create `src/structures/structures.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Structure } from './entities/structure.entity';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';

@Injectable()
export class StructuresService {
  constructor(
    @InjectRepository(Structure)
    private structureRepository: Repository<Structure>,
  ) {}

  async create(createStructureDto: CreateStructureDto): Promise<Structure> {
    const structure = this.structureRepository.create(createStructureDto);

    if (createStructureDto.parentId) {
      const parent = await this.structureRepository.findOne({
        where: { id: createStructureDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent structure not found');
      }
    }

    return this.structureRepository.save(structure);
  }

  async findAll(): Promise<Structure[]> {
    return this.structureRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Structure> {
    const structure = await this.structureRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!structure) {
      throw new NotFoundException('Structure not found');
    }

    return structure;
  }

  async update(
    id: string,
    updateStructureDto: UpdateStructureDto,
  ): Promise<Structure> {
    const structure = await this.findOne(id);

    // Prevent circular references
    if (updateStructureDto.parentId) {
      if (updateStructureDto.parentId === id) {
        throw new BadRequestException('Structure cannot be its own parent');
      }

      const wouldCreateCycle = await this.wouldCreateCycle(
        structure,
        updateStructureDto.parentId,
      );

      if (wouldCreateCycle) {
        throw new BadRequestException(
          'Operation would create a circular reference',
        );
      }
    }

    Object.assign(structure, updateStructureDto);
    return this.structureRepository.save(structure);
  }

  async remove(id: string): Promise<void> {
    const structure = await this.findOne(id);

    if (structure.children && structure.children.length > 0) {
      throw new BadRequestException('Cannot delete structure with children');
    }

    await this.structureRepository.remove(structure);
  }

  async findDescendants(id: string): Promise<Structure[]> {
    const result = await this.structureRepository.query(
      `
      WITH RECURSIVE structure_tree AS (
        -- Base case: get the root node
        SELECT id, name, "parentId", 1 as level
        FROM structures
        WHERE id = $1

        UNION ALL

        -- Recursive case: get all children
        SELECT s.id, s.name, s."parentId", st.level + 1
        FROM structures s
        INNER JOIN structure_tree st ON s."parentId" = st.id
      )
      SELECT * FROM structure_tree ORDER BY level;
    `,
      [id],
    );

    return result;
  }

  private async wouldCreateCycle(
    structure: Structure,
    newParentId: string,
  ): Promise<boolean> {
    let current = await this.structureRepository.findOne({
      where: { id: newParentId },
      relations: ['parent'],
    });

    while (current) {
      if (current.id === structure.id) {
        return true;
      }
      current = current.parent;
    }

    return false;
  }
}
```

### 5. Implement the Controller

Create `src/structures/structures.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StructuresService } from './structures.service';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { Structure } from './entities/structure.entity';

@ApiTags('structures')
@Controller('structures')
export class StructuresController {
  constructor(private readonly structuresService: StructuresService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new structure' })
  @ApiResponse({
    status: 201,
    description: 'The structure has been successfully created.',
    type: Structure,
  })
  create(@Body() createStructureDto: CreateStructureDto): Promise<Structure> {
    return this.structuresService.create(createStructureDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all structures' })
  @ApiResponse({
    status: 200,
    description: 'Returns all structures',
    type: [Structure],
  })
  findAll(): Promise<Structure[]> {
    return this.structuresService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a structure by id' })
  @ApiResponse({
    status: 200,
    description: 'Returns the structure',
    type: Structure,
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Structure> {
    return this.structuresService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a structure' })
  @ApiResponse({
    status: 200,
    description: 'The structure has been successfully updated.',
    type: Structure,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStructureDto: UpdateStructureDto,
  ): Promise<Structure> {
    return this.structuresService.update(id, updateStructureDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a structure' })
  @ApiResponse({
    status: 200,
    description: 'The structure has been successfully deleted.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.structuresService.remove(id);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Get all descendants of a structure' })
  @ApiResponse({
    status: 200,
    description: 'Returns all descendants of the structure',
    type: [Structure],
  })
  findDescendants(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Structure[]> {
    return this.structuresService.findDescendants(id);
  }
}
```

### 6. Update App Module

Update `src/app.module.ts` to include the new module:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StructuresModule } from './structures/structures.module';
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
    StructuresModule,
  ],
})
export class AppModule {}
```

## Testing the Implementation

### 1. Start the Application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api
```

### 2. Test API Endpoints

Use Swagger UI (http://localhost:3000/api) or Postman to test the endpoints:

1. Create a root structure:

```json
POST /structures
{
  "name": "Company",
  "metadata": {
    "description": "Root organization"
  }
}
```

2. Create a child structure:

```json
POST /structures
{
  "name": "Engineering",
  "parentId": "PARENT_ID_FROM_PREVIOUS_RESPONSE",
  "metadata": {
    "description": "Engineering department"
  }
}
```

## Common Issues and Solutions

### Database Connection Issues

```bash
# Reset the database
docker-compose down -v
docker-compose up -d

# Check database logs
docker-compose logs postgres
```

### Circular Reference Detection

The `wouldCreateCycle` method prevents:

- Setting a structure as its own parent
- Creating circular references in the hierarchy

## Performance Considerations

1. **Indexing**: We've added indexes on frequently queried columns:

   - `name` for search operations
   - `parentId` for hierarchy operations

2. **Query Optimization**: The `findDescendants` method uses a recursive CTE for efficient tree traversal

3. **Batch Operations**: For large datasets, consider implementing batch operations

## Next Steps

In the next article, we'll:

1. Implement authentication and authorization
2. Secure our endpoints
3. Add user-based access control

## Additional Resources

- [TypeORM Relations Documentation](https://typeorm.io/#/relations)
- [PostgreSQL Recursive Queries](https://www.postgresql.org/docs/current/queries-with.html)
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)

## Homework

1. Add an endpoint to move a structure to a new parent
2. Implement a method to find all ancestors of a structure
3. Add validation for maximum depth in the hierarchy
4. Create unit tests for the service methods

Remember to commit your changes:

```bash
git add .
git commit -m "Implement structures module with hierarchical data support"
```

In the next article, we'll focus on implementing authentication and authorization!
