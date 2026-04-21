import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { HealthService } from './health.service';

describe('HealthService', () => {
  const originalEnv = process.env;
  let moduleRef: { get: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    process.env = { ...originalEnv };
    moduleRef = {
      get: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) =>
        key === 'npm_package_version' ? '0.0.1' : undefined,
      ),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should report ok when database checks are disabled', async () => {
    process.env.DATABASE_ENABLED = 'false';
    const service = new HealthService(
      moduleRef as unknown as ModuleRef,
      configService as unknown as ConfigService,
    );

    const result = await service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.checks.app.status).toBe('up');
    expect(result.checks.database.status).toBe('disabled');
    expect(moduleRef.get).not.toHaveBeenCalled();
  });

  it('should report ok when database query succeeds', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_ENABLED = 'true';
    const dataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    moduleRef.get.mockReturnValue(dataSource as unknown as DataSource);
    const service = new HealthService(
      moduleRef as unknown as ModuleRef,
      configService as unknown as ConfigService,
    );

    const result = await service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.checks.database.status).toBe('up');
    expect(result.checks.database.latencyMs).toEqual(expect.any(Number));
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('should report error when database query fails', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_ENABLED = 'true';
    const dataSource = {
      isInitialized: true,
      query: jest.fn().mockRejectedValue(new Error('connection refused')),
    };
    moduleRef.get.mockReturnValue(dataSource as unknown as DataSource);
    const service = new HealthService(
      moduleRef as unknown as ModuleRef,
      configService as unknown as ConfigService,
    );

    const result = await service.getHealth();

    expect(result.status).toBe('error');
    expect(result.checks.database.status).toBe('down');
    expect(result.checks.database.message).toBe('connection refused');
  });
});
