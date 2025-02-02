# Understanding TypeORM: From Zero to Hero

## What is TypeORM?

Think of TypeORM as a translator between your TypeScript code and your database. Instead of writing raw SQL queries like:

```sql
SELECT * FROM users WHERE email = 'john@example.com';
```

You can write TypeScript code like:

```typescript
const user = await userRepository.findOne({
  where: { email: 'john@example.com' },
});
```

## Basic Concepts

### 1. Entities (Your Database Tables)

Entities are like blueprints for your database tables. They're just TypeScript classes with special decorators.

```typescript
// Simple Entity Example
@Entity()
class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;
}
```

Think of it like this:

- `@Entity()` = "Hey, this is a database table!"
- `@Column()` = "This is a column in the table!"
- `@PrimaryGeneratedColumn()` = "This is a special column that automatically gets a unique ID"

### 2. Relations (How Tables Connect)

Just like in real life, things are related to each other. In our app, a Structure can have a parent Structure:

```typescript
@Entity()
class Structure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // This Structure has one parent
  @ManyToOne(() => Structure, (structure) => structure.children)
  parent: Structure;

  // This Structure can have many children
  @OneToMany(() => Structure, (structure) => structure.parent)
  children: Structure[];
}
```

Types of Relations:

- `@OneToOne`: One-to-one (like a person and their social security number)
- `@OneToMany`/`@ManyToOne`: One-to-many (like a parent and children)
- `@ManyToMany`: Many-to-many (like students and courses)

### 3. Repositories (Your Database Helpers)

Repositories are like personal assistants that help you work with your database:

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Find a user
  async findOne(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  // Create a user
  async create(userData: CreateUserDto) {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }
}
```

## Our Database Schema

Let's look at our actual database schema and how we implement it:

### 1. Structure Entity (Our Main Table)

```typescript
// src/structures/entities/structure.entity.ts
@Entity('structures')
export class Structure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index() // Makes searching by name faster
  name: string;

  @Column({ nullable: true })
  @Index()
  parentId: string;

  // Self-referential relationship
  @ManyToOne(() => Structure, (structure) => structure.children)
  @JoinColumn({ name: 'parentId' })
  parent: Structure;

  @OneToMany(() => Structure, (structure) => structure.parent)
  children: Structure[];

  // Extra data in JSON format
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  // Automatically managed timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. User Entity (For Authentication)

```typescript
// src/users/entities/user.entity.ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Common Database Operations

### 1. Finding Records

```typescript
// Find one by ID
const structure = await structuresRepository.findOne({
  where: { id: '123' },
});

// Find many with conditions
const structures = await structuresRepository.find({
  where: { name: Like('%Department%') },
});

// Find with relations
const structureWithChildren = await structuresRepository.findOne({
  where: { id: '123' },
  relations: ['children', 'parent'],
});
```

### 2. Creating Records

```typescript
// Create a new structure
const newStructure = structuresRepository.create({
  name: 'Engineering',
  parentId: parentStructure.id,
  metadata: { description: 'Engineering department' },
});

// Save to database
await structuresRepository.save(newStructure);
```

### 3. Updating Records

```typescript
// Update a structure
await structuresRepository.update(id, {
  name: 'New Name',
  metadata: { updated: true },
});

// Or with entity
structure.name = 'New Name';
await structuresRepository.save(structure);
```

### 4. Deleting Records

```typescript
// Delete by ID
await structuresRepository.delete(id);

// Or with entity
await structuresRepository.remove(structure);
```

### 5. Complex Queries (Our Tree Structure)

Here's how we find all descendants of a structure:

```typescript
// Using raw SQL with TypeORM for tree traversal
const descendants = await structuresRepository.query(
  `
  WITH RECURSIVE structure_tree AS (
    -- Base case: start with the target structure
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
  [structureId],
);
```

## TypeORM Configuration

Here's how we configure TypeORM in our app:

```typescript
// src/config/database.config.ts
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
  synchronize: process.env.NODE_ENV !== 'production', // Auto-create tables in development
  logging: process.env.NODE_ENV === 'development',
});
```

## Best Practices

1. **Use TypeORM Decorators Wisely**

   - Add `@Index()` for frequently searched columns
   - Use appropriate column types
   - Set `nullable: true` when needed

2. **Handle Relations Carefully**

   ```typescript
   // Load relations only when needed
   const structure = await structuresRepository.findOne({
     where: { id },
     relations: ['parent', 'children'],
   });
   ```

3. **Use Transactions for Multiple Operations**

   ```typescript
   await dataSource.transaction(async (manager) => {
     // All operations here are part of the same transaction
     await manager.save(structure1);
     await manager.save(structure2);
   });
   ```

4. **Optimize Queries**
   - Use `QueryBuilder` for complex queries
   - Select only needed columns
   - Use pagination for large datasets

## Common Issues and Solutions

1. **Circular Dependencies**

   ```typescript
   // Check for circular references
   private async wouldCreateCycle(structure: Structure, newParentId: string): Promise<boolean> {
     let current = await this.structuresRepository.findOne({
       where: { id: newParentId },
       relations: ['parent']
     });

     while (current) {
       if (current.id === structure.id) return true;
       current = current.parent;
     }
     return false;
   }
   ```

2. **N+1 Query Problem**

   ```typescript
   // Bad: Will make N+1 queries
   const structures = await structuresRepository.find();
   for (const structure of structures) {
     await structure.children;
   }

   // Good: Load all data in one query
   const structures = await structuresRepository.find({
     relations: ['children'],
   });
   ```

## Tips for Beginners

1. **Start with Simple Entities**

   - Begin with basic columns
   - Add relations gradually
   - Use the TypeORM CLI for migrations

2. **Use TypeORM CLI**

   ```bash
   # Generate a migration
   typeorm migration:generate -n CreateStructuresTable

   # Run migrations
   typeorm migration:run
   ```

3. **Debug Your Queries**

   ```typescript
   // Enable logging to see generated SQL
   logging: true,
   ```

4. **Learn from Errors**
   - Read error messages carefully
   - Check column types match your data
   - Verify relation configurations

Remember: TypeORM is your friend! It's here to make database operations easier and type-safe. Start simple and gradually explore more complex features as you need them.
