# Building Enterprise-Grade Authentication in NestJS: A Deep Dive

## Introduction

In this comprehensive guide, we'll implement a production-ready authentication and authorization system using NestJS. This implementation follows enterprise security standards and is suitable for large-scale applications handling sensitive data.

## Technical Stack Overview

- **NestJS**: For robust backend architecture
- **Passport.js**: For flexible authentication
- **JWT**: For secure token-based auth
- **bcrypt**: For password hashing
- **TypeORM**: For user management
- **Redis**: For token blacklisting
- **Rate Limiting**: For security
- **Role-Based Access Control (RBAC)**: For fine-grained permissions
- **Permission-Based Access Control**: For granular access management

## Core Implementation

### 1. Secure User Entity with Permissions

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  @Exclude() // Never expose passwords in responses
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @OneToMany(() => Permission, (permission) => permission.user, {
    cascade: true,
    eager: true,
  })
  permissions: Permission[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  passwordChangedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
```

### 2. Permission Entity for Granular Access Control

```typescript
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

### 3. Enhanced Authorization Guard

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const targetId = request.params.id;

    if (!user || !targetId) {
      return false;
    }

    return this.usersService.canAccessUser(user.id, targetId);
  }
}
```

### 4. Permission Management Service

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

### 5. JWT Strategy Implementation

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload) {
    // Check token blacklist
    const isBlacklisted = await this.cacheManager.get(
      `blacklist_${request.headers.authorization}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Verify user exists and is active
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const passwordChangedTime = user.passwordChangedAt.getTime() / 1000;
      if (payload.iat < passwordChangedTime) {
        throw new UnauthorizedException('Password has been changed');
      }
    }

    return user;
  }
}
```

### 6. Advanced Authentication Service

```typescript
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (user && (await user.validatePassword(password))) {
      // Update last login timestamp
      await this.usersService.update(user.id, {
        lastLoginAt: new Date(),
      });

      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION'),
    });

    // Generate refresh token
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
    });

    // Store refresh token
    await this.cacheManager.set(
      `refresh_${refreshToken}`,
      user.id,
      parseInt(this.configService.get('JWT_REFRESH_EXPIRATION')),
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(token: string) {
    // Add token to blacklist
    const decoded = this.jwtService.decode(token) as JwtPayload;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    await this.cacheManager.set(`blacklist_${token}`, true, expiresIn);
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verify(refreshToken);
      const storedUserId = await this.cacheManager.get(
        `refresh_${refreshToken}`,
      );

      if (!storedUserId || storedUserId !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findOne(payload.sub);
      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
```

### 7. Role-Based Access Control

```typescript
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Super admin bypass
    if (
      user.role === UserRole.ADMIN &&
      this.configService.get('ADMIN_OVERRIDE') === 'true'
    ) {
      return true;
    }

    return requiredRoles.some((role) => user.role === role);
  }
}
```

### 8. Rate Limiting and Security

```typescript
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    return req.ips.length ? req.ips[0] : req.ip;
  }
}

// Apply rate limiting to authentication endpoints
@Controller('auth')
@UseGuards(ThrottlerBehindProxyGuard)
export class AuthController {
  @Post('login')
  @Throttle(5, 60) // 5 attempts per minute
  async login(@Body() loginDto: LoginDto) {
    // Implementation
  }
}
```

## Security Best Practices

1. **Password Security**

   - Bcrypt with high salt rounds
   - Password complexity requirements
   - Password change history
   - Prevent password reuse

2. **Token Security**

   - Short-lived access tokens
   - Refresh token rotation
   - Token blacklisting
   - Secure token storage

3. **Request Security**

   - Rate limiting
   - CORS configuration
   - Helmet middleware
   - Request validation

4. **Data Protection**
   - Password hashing
   - Sensitive data encryption
   - Secure headers
   - XSS protection

## Testing Strategy

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('validateUser', () => {
    it('should return user object when credentials are valid', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: await bcrypt.hash('password', 10),
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(user);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeDefined();
      expect(result.password).toBeUndefined();
    });
  });
});
```

## Performance Considerations

1. **Caching Strategy**

   - Token blacklist in Redis
   - User session caching
   - Rate limit counters
   - Refresh token storage

2. **Database Optimization**

   - Indexed user lookups
   - Efficient role queries
   - Connection pooling
   - Query optimization

3. **Scalability**
   - Stateless authentication
   - Distributed caching
   - Horizontal scaling
   - Load balancing

## Monitoring and Logging

```typescript
@Injectable()
export class AuthenticationLogger implements LoggerService {
  private logger = new Logger('Authentication');

  log(message: string) {
    this.logger.log(message);
  }

  error(message: string, trace: string) {
    this.logger.error(message, trace);
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }
}
```

## Senior Developer Insights

1. **Security Considerations**

   - Regular security audits
   - Dependency scanning
   - Penetration testing
   - Security headers

2. **Maintainability**

   - Clean code principles
   - Comprehensive documentation
   - Error handling
   - Logging strategy

3. **Scalability**

   - Horizontal scaling
   - Cache strategies
   - Performance monitoring
   - Load testing

4. **Best Practices**
   - Code reviews
   - Security guidelines
   - Testing procedures
   - Documentation standards

## Conclusion

This implementation provides:

- Enterprise-grade security
- Scalable authentication
- Flexible authorization
- Comprehensive testing
- Production readiness

## Resources

- [NestJS Security](https://docs.nestjs.com/security)
- [JWT Best Practices](https://auth0.com/blog/jwt-handbook/)
- [OWASP Authentication Guidelines](https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/04-Authentication_Testing/README)
- [OAuth 2.0 Specifications](https://oauth.net/2/)
