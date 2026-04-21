import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { isDatabaseEnabled } from '../database/typeorm.config';
import { HealthCheckResult, HealthResponse } from './health.types';

const DATABASE_CHECK_TIMEOUT_MS = 1000;

@Injectable()
export class HealthService {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const database = await this.checkDatabase();

    return {
      status: database.status === 'down' ? 'error' : 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: this.configService.get<string>('npm_package_version') ?? '0.0.1',
      checks: {
        app: { status: 'up' },
        database,
      },
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    if (!isDatabaseEnabled(process.env)) {
      return {
        status: 'disabled',
        message: 'Database checks are disabled for this environment.',
      };
    }

    const dataSource = this.getDataSource();

    if (!dataSource?.isInitialized) {
      return {
        status: 'down',
        message: 'Database connection is not initialized.',
      };
    }

    const startedAt = Date.now();
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        dataSource.query('SELECT 1'),
        this.timeout(DATABASE_CHECK_TIMEOUT_MS, (id) => {
          timeoutId = id;
        }),
      ]);

      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        message:
          error instanceof Error ? error.message : 'Database check failed.',
      };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private getDataSource(): DataSource | undefined {
    try {
      return this.moduleRef.get(DataSource, { strict: false });
    } catch {
      return undefined;
    }
  }

  private timeout(
    timeoutMs: number,
    captureTimeoutId: (id: NodeJS.Timeout) => void,
  ): Promise<never> {
    return new Promise((_, reject) => {
      const timeoutId = setTimeout(
        () =>
          reject(new Error(`Database check timed out after ${timeoutMs}ms.`)),
        timeoutMs,
      );
      timeoutId.unref();
      captureTimeoutId(timeoutId);
    });
  }
}
