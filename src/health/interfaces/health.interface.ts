import { HealthCheckResult } from '@nestjs/terminus';

export interface IHealthService {
  check(): Promise<HealthCheckResult>;
}

export interface IHealthIndicator {
  checkHealth(): Promise<Record<string, any>>;
}
