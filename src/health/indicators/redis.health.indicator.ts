import { Injectable } from '@nestjs/common';
import { HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private health: HealthCheckService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.cacheManager.set('health-check-key', 'health-check', 10);
      const result = await this.cacheManager.get('health-check-key');

      if (result !== 'health-check') {
        throw new Error('Cache is not working properly');
      }

      return {
        [key]: {
          status: 'up',
        },
      };
    } catch (error) {
      return {
        [key]: {
          status: 'down',
          message: 'Redis health check failed',
        },
      };
    }
  }
}
