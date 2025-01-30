import { Injectable } from '@nestjs/common';
import { HealthCheckResult, HealthIndicatorResult } from '@nestjs/terminus';
import { HealthCheckService } from '@nestjs/terminus';
import { IHealthService } from '../interfaces/health.interface';
import { SystemHealthIndicators } from '../indicators/system.health.indicators';
import { DatabaseHealthIndicators } from '../indicators/database.health.indicators';
import { CacheHealthIndicators } from '../indicators/cache.health.indicators';

@Injectable()
export class HealthService implements IHealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly systemIndicators: SystemHealthIndicators,
    private readonly databaseIndicators: DatabaseHealthIndicators,
    private readonly cacheIndicators: CacheHealthIndicators,
  ) {}

  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => this.checkDatabase(),
      async () => this.checkCache(),
      async () => this.checkSystem(),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    return this.databaseIndicators.checkHealth();
  }

  private async checkCache(): Promise<HealthIndicatorResult> {
    return this.cacheIndicators.checkHealth();
  }

  private async checkSystem(): Promise<HealthIndicatorResult> {
    return this.systemIndicators.checkHealth();
  }
}
