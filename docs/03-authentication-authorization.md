# Authentication and Authorization in NestJS

## Introduction

In this third part of our series, we'll implement a secure authentication and authorization system for our hierarchical structures API. We'll use JWT (JSON Web Tokens) for authentication and implement role-based access control (RBAC) for authorization.

## Prerequisites

Ensure you have:

1. Completed Parts 1 and 2 of the tutorial
2. Basic understanding of JWT and authentication concepts
3. Running PostgreSQL instance (from Part 1)

## Step-by-Step Implementation

### 1. Install Required Dependencies

```bash
# Install authentication-related packages
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcrypt
npm install --save-dev @types/passport-jwt @types/bcrypt
```

### 2. Create User Entity

Create `src/users/entities/user.entity.ts`:

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
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

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
```

### 3. Create Authentication DTOs

Create `src/auth/dto/login.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'The user password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
```

Create `src/auth/dto/register.dto.ts`:

```typescript
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'The user password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    enum: UserRole,
    default: UserRole.USER,
    description: 'The role of the user',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
```

### 4. Implement JWT Strategy

Create `src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### 5. Create Auth Service

Create `src/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await user.validatePassword(password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
```

### 6. Create Auth Controller

Create `src/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
```

### 7. Implement Role-Based Authorization

Create `src/auth/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

Create `src/auth/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### 8. Create Auth Module

Create `src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION'),
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

### 9. Update App Module

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
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
    AuthModule,
    UsersModule,
    StructuresModule,
  ],
})
export class AppModule {}
```

### 10. Secure Structure Endpoints

Update `src/structures/structures.controller.ts`:

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('structures')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StructuresController {
  // ... existing code ...

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createStructureDto: CreateStructureDto) {
    return this.structuresService.create(createStructureDto);
  }

  @Get()
  @Roles(UserRole.USER, UserRole.ADMIN)
  findAll() {
    return this.structuresService.findAll();
  }

  // ... other endpoints ...
}
```

## Testing the Implementation

### 1. Start the Application

```bash
# Restart the application to apply changes
docker-compose down
docker-compose up --build -d
```

### 2. Test Authentication Endpoints

Using Postman or Swagger UI (http://localhost:3000/api):

1. Register a new user:

```json
POST /auth/register
{
  "email": "admin@example.com",
  "password": "password123",
  "role": "admin"
}
```

2. Login with credentials:

```json
POST /auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}
```

3. Use the returned JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Common Issues and Solutions

### JWT Token Issues

```typescript
// Check token expiration
const decodedToken = this.jwtService.decode(token);
if (Date.now() >= decodedToken.exp * 1000) {
  throw new UnauthorizedException('Token has expired');
}
```

### Password Hashing Issues

```typescript
// Ensure proper password hashing
const SALT_ROUNDS = 10;
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
```

## Security Best Practices

1. **Password Storage**:

   - Never store plain-text passwords
   - Use bcrypt for password hashing
   - Implement password strength requirements

2. **JWT Security**:

   - Use strong secrets
   - Set appropriate token expiration
   - Implement refresh token mechanism

3. **Rate Limiting**:
   - Implement rate limiting for login attempts
   - Add request throttling

## Next Steps

In the next article, we'll:

1. Implement caching with Redis
2. Add rate limiting
3. Optimize API performance

## Additional Resources

- [NestJS Authentication Documentation](https://docs.nestjs.com/security/authentication)
- [JWT.io](https://jwt.io/)
- [Password Hashing Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

## Homework

1. Implement refresh tokens
2. Add password reset functionality
3. Create user profile endpoints
4. Add email verification

Remember to commit your changes:

```bash
git add .
git commit -m "Implement authentication and authorization"
```

In the next article, we'll focus on implementing caching with Redis to improve our API's performance!
