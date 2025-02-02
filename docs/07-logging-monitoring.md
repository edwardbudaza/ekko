# Logging, Monitoring, and Error Tracking in NestJS

## Introduction

In this seventh part of our series, we'll implement comprehensive logging, monitoring, and error tracking systems for our hierarchical structures API. We'll use Winston for logging, Prometheus for metrics, and integrate error tracking with Sentry.

## Logging Implementation

### Winston Logger Setup

```typescript
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              nestWinstonModuleUtilities.format.nestLike(),
            ),
          }),
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
        ],
      }),
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
```

### Custom Logger Service

```typescript
@Injectable()
export class CustomLogger implements LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
```

## Monitoring with Prometheus

### Metrics Setup

```typescript
@Injectable()
export class PrometheusService {
  private readonly registry: Registry;
  private readonly requestCounter: Counter;
  private readonly requestDuration: Histogram;
  private readonly activeUsers: Gauge;

  constructor() {
    this.registry = new Registry();

    this.requestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    });

    this.requestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of currently active users',
    });

    this.registry.registerMetric(this.requestCounter);
    this.registry.registerMetric(this.requestDuration);
    this.registry.registerMetric(this.activeUsers);
  }

  incrementRequestCount(method: string, path: string, status: number): void {
    this.requestCounter.labels(method, path, status.toString()).inc();
  }

  recordRequestDuration(method: string, path: string, duration: number): void {
    this.requestDuration.labels(method, path).observe(duration);
  }

  setActiveUsers(count: number): void {
    this.activeUsers.set(count);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

### Metrics Controller

```typescript
@Controller('metrics')
export class MetricsController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  @Header('Content-Type', PrometheusContentType)
  async getMetrics(): Promise<string> {
    return this.prometheusService.getMetrics();
  }
}
```

### Metrics Interceptor

```typescript
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly prometheusService: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - start) / 1000;
          this.prometheusService.recordRequestDuration(method, path, duration);
          this.prometheusService.incrementRequestCount(method, path, 200);
        },
        error: (error) => {
          const duration = (Date.now() - start) / 1000;
          this.prometheusService.recordRequestDuration(method, path, duration);
          this.prometheusService.incrementRequestCount(
            method,
            path,
            error.status || 500,
          );
        },
      }),
    );
  }
}
```

## Error Tracking with Sentry

### Sentry Setup

```typescript
@Module({
  imports: [
    SentryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        dsn: config.get('SENTRY_DSN'),
        environment: config.get('NODE_ENV'),
        release: process.env.npm_package_version,
        tracesSampleRate: 1.0,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Tracing.Integrations.Express(),
        ],
      }),
    }),
  ],
})
export class SentryModule {}
```

### Sentry Interceptor

```typescript
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        Sentry.captureException(error);
        throw error;
      }),
    );
  }
}
```

## Health Checks

### Health Controller

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
      () => this.memoryHealthCheck(),
    ]);
  }

  private async memoryHealthCheck(): Promise<HealthIndicatorResult> {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed / 1024 / 1024; // MB

    const isHealthy = heapUsed < 512; // 512MB threshold

    return {
      memory: {
        status: isHealthy ? 'up' : 'down',
        heapUsed: `${Math.round(heapUsed)}MB`,
      },
    };
  }
}
```

## Application Insights

### Performance Monitoring

```typescript
@Injectable()
export class PerformanceMonitoringService {
  private readonly metrics: Map<string, number[]> = new Map();

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(value);
  }

  getMetricStats(name: string): {
    avg: number;
    min: number;
    max: number;
    p95: number;
  } {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, p95: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const p95Index = Math.floor(values.length * 0.95);

    return {
      avg: values.reduce((a, b) => a + b) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index],
    };
  }
}
```

### Request Tracking

```typescript
@Injectable()
export class RequestTrackingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: CustomLogger,
    private readonly performanceMonitoring: PerformanceMonitoringService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId = uuid();
    const startTime = Date.now();

    request.requestId = requestId;

    this.logger.log(
      `Incoming ${request.method} ${request.url}`,
      'RequestTracking',
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.performanceMonitoring.recordMetric(
            `request_duration_${request.method}_${request.path}`,
            duration,
          );

          this.logger.log(
            `Completed ${request.method} ${request.url} in ${duration}ms`,
            'RequestTracking',
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `Failed ${request.method} ${request.url} in ${duration}ms: ${error.message}`,
            error.stack,
            'RequestTracking',
          );
        },
      }),
    );
  }
}
```

## What's Next?

In Part 8, we'll explore implementing CI/CD pipelines and deployment strategies for our application.

## Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
- [Sentry Documentation](https://docs.sentry.io/)

## Conclusion

This article covered the implementation of comprehensive logging, monitoring, and error tracking in our NestJS application. We explored various tools and techniques to ensure our application is observable and maintainable in production. In the next article, we'll focus on implementing CI/CD pipelines and deployment strategies.
