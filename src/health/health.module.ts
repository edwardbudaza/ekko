import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { HealthController } from './health.controller';
import { HealthService } from './services/health.service';
import { SystemHealthIndicators } from './indicators/system.health.indicators';
import { DatabaseHealthIndicators } from './indicators/database.health.indicators';
import { CacheHealthIndicators } from './indicators/cache.health.indicators';
import { RedisHealthIndicator } from './indicators/redis.health.indicator';

@Module({
  imports: [TerminusModule, HttpModule, TypeOrmModule, CacheModule.register()],
  controllers: [HealthController],
  providers: [
    HealthService,
    SystemHealthIndicators,
    DatabaseHealthIndicators,
    CacheHealthIndicators,
    RedisHealthIndicator,
  ],
  exports: [HealthService],
})
export class HealthModule {}
