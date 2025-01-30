import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { HealthService } from '../services/health.service';
import { SystemHealthIndicators } from '../indicators/system.health.indicators';
import { DatabaseHealthIndicators } from '../indicators/database.health.indicators';
import { CacheHealthIndicators } from '../indicators/cache.health.indicators';

describe('HealthService', () => {
  let service: HealthService;
  let healthCheckService: HealthCheckService;
  let systemIndicators: SystemHealthIndicators;
  let databaseIndicators: DatabaseHealthIndicators;
  let cacheIndicators: CacheHealthIndicators;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: SystemHealthIndicators,
          useValue: {
            checkHealth: jest.fn(),
          },
        },
        {
          provide: DatabaseHealthIndicators,
          useValue: {
            checkHealth: jest.fn(),
          },
        },
        {
          provide: CacheHealthIndicators,
          useValue: {
            checkHealth: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    systemIndicators = module.get<SystemHealthIndicators>(
      SystemHealthIndicators,
    );
    databaseIndicators = module.get<DatabaseHealthIndicators>(
      DatabaseHealthIndicators,
    );
    cacheIndicators = module.get<CacheHealthIndicators>(CacheHealthIndicators);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('check', () => {
    it('should call health check service with all indicators', async () => {
      const mockHealthCheck: HealthIndicatorResult = {
        database: {
          status: 'up',
        },
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue({
        status: 'ok',
        info: mockHealthCheck,
        details: mockHealthCheck,
        error: {},
      });

      const result = await service.check();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'ok',
        info: mockHealthCheck,
        details: mockHealthCheck,
        error: {},
      });
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(healthCheckService, 'check')
        .mockRejectedValue(new Error('Health check failed'));

      await expect(service.check()).rejects.toThrow('Health check failed');
    });
  });
});
