import { Injectable } from '@nestjs/common';
import { IHealthIndicator } from '../interfaces/health.interface';
import { RedisHealthIndicator } from './redis.health.indicator';

@Injectable()
export class CacheHealthIndicators implements IHealthIndicator {
  constructor(private readonly redis: RedisHealthIndicator) {}

  async checkHealth(): Promise<Record<string, any>> {
    return this.redis.isHealthy('redis');
  }
}
