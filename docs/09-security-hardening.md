# Security Best Practices and Application Hardening in NestJS

## Introduction

In this ninth part of our series, we'll implement comprehensive security measures and harden our NestJS application for production use. We'll cover various security best practices, including secure headers, rate limiting, input validation, and protection against common web vulnerabilities.

## Security Headers Implementation

### Helmet Configuration

```typescript
@Module({
  imports: [
    // Other imports...
    HelmetModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            scriptSrc: ["'self'"],
          },
        },
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: { policy: 'same-site' },
        dnsPrefetchControl: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        ieNoOpen: true,
        noSniff: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        xssFilter: true,
      }),
    }),
  ],
})
export class AppModule {}
```

## CORS Configuration

```typescript
@Module({
  imports: [
    // Other imports...
    CorsModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        origin: configService.get('ALLOWED_ORIGINS').split(','),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Total-Count'],
        credentials: true,
        maxAge: 3600,
      }),
    }),
  ],
})
export class AppModule {}
```

## Input Validation and Sanitization

### Request Validation Pipe

```typescript
@Injectable()
export class ValidationPipe extends DefaultValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    });
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    try {
      const result = await super.transform(value, metadata);
      return this.sanitize(result);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new ValidationException(error.getResponse());
      }
      throw error;
    }
  }

  private sanitize(value: any): any {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitize(val);
      }
      return sanitized;
    }

    if (typeof value === 'string') {
      return DOMPurify.sanitize(value);
    }

    return value;
  }
}
```

### Custom Validators

```typescript
@ValidatorConstraint({ name: 'isSecurePassword', async: false })
export class IsSecurePasswordConstraint
  implements ValidatorConstraintInterface
{
  validate(password: string) {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  defaultMessage() {
    return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character';
  }
}

export function IsSecurePassword(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSecurePasswordConstraint,
    });
  };
}
```

## SQL Injection Prevention

### TypeORM Configuration

```typescript
@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get('DB_HOST'),
      port: this.configService.get('DB_PORT'),
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_DATABASE'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: ['error'],
      ssl: this.configService.get('NODE_ENV') === 'production',
      extra: {
        max: 25,
        ssl: {
          rejectUnauthorized: false,
        },
      },
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsRun: true,
    };
  }
}
```

## XSS Protection

### Content Security Policy

```typescript
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "frame-ancestors 'none'; " +
        "form-action 'self'",
    );
    next();
  }
}
```

## JWT Security

### JWT Configuration

```typescript
@Injectable()
export class JwtConfigService implements JwtOptionsFactory {
  constructor(private configService: ConfigService) {}

  createJwtOptions(): JwtModuleOptions {
    return {
      secret: this.configService.get('JWT_SECRET'),
      signOptions: {
        expiresIn: this.configService.get('JWT_EXPIRATION'),
        algorithm: 'HS512',
        issuer: 'ekko-api',
        audience: 'ekko-client',
        notBefore: 0,
      },
      verifyOptions: {
        algorithms: ['HS512'],
        issuer: 'ekko-api',
        audience: 'ekko-client',
      },
    };
  }
}
```

## Password Security

### Password Service

```typescript
@Injectable()
export class PasswordService {
  private readonly SALT_ROUNDS = 12;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateResetToken(): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  }

  isPasswordBreached(password: string): Promise<boolean> {
    const sha1 = crypto
      .createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    return axios
      .get(`https://api.pwnedpasswords.com/range/${prefix}`)
      .then((response) => {
        const hashes = response.data.split('\n');
        return hashes.some((hash) => hash.split(':')[0] === suffix);
      });
  }
}
```

## Request Rate Limiting

### Advanced Rate Limiting

```typescript
@Injectable()
export class AdvancedThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(CACHE_MANAGER) protected cacheManager: Cache,
    private configService: ConfigService,
  ) {
    super();
  }

  protected async getTracker(req: Request): Promise<string> {
    let tracker = req.ip;

    if (req.user) {
      tracker = `${req.ip}-${(req.user as User).id}`;
    }

    const path = req.route?.path || req.path;
    return `${tracker}-${req.method}-${path}`;
  }

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tracker = await this.getTracker(request);

    const key = this.generateKey(context, tracker);
    const requests = (await this.cacheManager.get<number[]>(key)) || [];

    const now = Date.now();
    const windowMs = ttl * 1000;

    // Remove expired timestamps
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    if (recentRequests.length >= limit) {
      throw new ThrottlerException();
    }

    recentRequests.push(now);
    await this.cacheManager.set(key, recentRequests, ttl);

    return true;
  }
}
```

## Audit Logging

### Audit Service

```typescript
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private readonly logger: CustomLogger,
  ) {}

  async log(data: {
    userId: string;
    action: string;
    resource: string;
    details: any;
    ip: string;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        ...data,
        timestamp: new Date(),
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error('Failed to save audit log', error.stack);
    }
  }

  async getAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: { page: number; limit: number },
  ): Promise<[AuditLog[], number]> {
    const query = this.auditLogRepository.createQueryBuilder('audit_log');

    if (filters.userId) {
      query.andWhere('audit_log.userId = :userId', { userId: filters.userId });
    }

    if (filters.action) {
      query.andWhere('audit_log.action = :action', { action: filters.action });
    }

    if (filters.resource) {
      query.andWhere('audit_log.resource = :resource', {
        resource: filters.resource,
      });
    }

    if (filters.startDate) {
      query.andWhere('audit_log.timestamp >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('audit_log.timestamp <= :endDate', {
        endDate: filters.endDate,
      });
    }

    return query
      .orderBy('audit_log.timestamp', 'DESC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();
  }
}
```

## What's Next?

In Part 10, we'll explore implementing advanced features and optimizations to enhance our application's functionality and performance.

## Additional Resources

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [NestJS Security Documentation](https://docs.nestjs.com/security/authentication)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)

## Conclusion

This article covered comprehensive security measures and hardening techniques for our NestJS application. We explored various security best practices, including secure headers, input validation, and protection against common web vulnerabilities. In the next article, we'll focus on implementing advanced features and optimizations.
