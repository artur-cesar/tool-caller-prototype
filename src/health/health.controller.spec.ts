import { HttpStatus } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthService: jest.Mocked<Pick<HealthService, 'getHealth'>>;
  let controller: HealthController;

  beforeEach(() => {
    healthService = {
      getHealth: jest.fn(),
    };
    controller = new HealthController(
      healthService as unknown as HealthService,
    );
  });

  it('should return health response with default 200 status', async () => {
    const response = {
      status: jest.fn(),
    };
    const health = {
      status: 'ok' as const,
      timestamp: '2026-04-21T14:58:00.000Z',
      uptimeSeconds: 10,
      version: '0.0.1',
      checks: {
        app: { status: 'up' as const },
        database: { status: 'up' as const, latencyMs: 1 },
      },
    };
    healthService.getHealth.mockResolvedValue(health);

    const result = await controller.getHealth(response as never);

    expect(result).toBe(health);
    expect(response.status).not.toHaveBeenCalled();
  });

  it('should set 503 status when health is unhealthy', async () => {
    const response = {
      status: jest.fn(),
    };
    const health = {
      status: 'error' as const,
      timestamp: '2026-04-21T14:58:00.000Z',
      uptimeSeconds: 10,
      version: '0.0.1',
      checks: {
        app: { status: 'up' as const },
        database: { status: 'down' as const, message: 'Database is down.' },
      },
    };
    healthService.getHealth.mockResolvedValue(health);

    const result = await controller.getHealth(response as never);

    expect(result).toBe(health);
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });
});
