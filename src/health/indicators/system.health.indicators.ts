import { Injectable } from '@nestjs/common';
import { MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { IHealthIndicator } from '../interfaces/health.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SystemHealthIndicators implements IHealthIndicator {
  constructor(
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  async checkHealth(): Promise<Record<string, any>> {
    const heapLimit =
      this.config.get('MEMORY_HEAP_LIMIT_MB', 150) * 1024 * 1024;
    const diskThreshold = this.config.get('DISK_THRESHOLD_PERCENT', 0.9);

    const [memoryHealth, diskHealth] = await Promise.all([
      this.memory.checkHeap('memory_heap', heapLimit),
      this.disk.checkStorage('disk', {
        thresholdPercent: diskThreshold,
        path: '/',
      }),
    ]);

    return {
      ...memoryHealth,
      ...diskHealth,
    };
  }
}
