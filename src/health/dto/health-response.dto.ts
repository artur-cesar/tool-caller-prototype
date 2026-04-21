import { ApiProperty } from '@nestjs/swagger';

class HealthCheckDto {
  @ApiProperty({
    description: 'Current dependency status.',
    enum: ['up', 'down', 'disabled'],
    example: 'up',
  })
  status: 'up' | 'down' | 'disabled';

  @ApiProperty({
    description: 'Check latency in milliseconds when the check performs I/O.',
    example: 8,
    required: false,
  })
  latencyMs?: number;

  @ApiProperty({
    description: 'Short diagnostic message when a check is down or disabled.',
    example: 'Database connection is not initialized.',
    required: false,
  })
  message?: string;
}

class HealthChecksDto {
  @ApiProperty({ type: HealthCheckDto })
  app: HealthCheckDto;

  @ApiProperty({ type: HealthCheckDto })
  database: HealthCheckDto;
}

export class HealthResponseDto {
  @ApiProperty({
    description: 'Overall service health.',
    enum: ['ok', 'error'],
    example: 'ok',
  })
  status: 'ok' | 'error';

  @ApiProperty({
    description: 'Health check timestamp in ISO 8601 format.',
    example: '2026-04-21T14:58:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Process uptime in seconds.',
    example: 123,
  })
  uptimeSeconds: number;

  @ApiProperty({
    description: 'Application version.',
    example: '0.0.1',
  })
  version: string;

  @ApiProperty({ type: HealthChecksDto })
  checks: HealthChecksDto;
}
