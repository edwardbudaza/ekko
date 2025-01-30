import { Injectable } from '@nestjs/common';
import { TypeOrmHealthIndicator } from '@nestjs/terminus';
import { IHealthIndicator } from '../interfaces/health.interface';

@Injectable()
export class DatabaseHealthIndicators implements IHealthIndicator {
  constructor(private readonly db: TypeOrmHealthIndicator) {}

  async checkHealth(): Promise<Record<string, any>> {
    return this.db.pingCheck('database');
  }
}
