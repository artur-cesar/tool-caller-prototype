import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Check application health',
    description:
      'Returns process health and dependency checks suitable for container probes, monitoring, and operational diagnostics.',
  })
  @ApiOkResponse({
    description: 'The application and required dependencies are healthy.',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'At least one required dependency is unhealthy.',
    type: HealthResponseDto,
  })
  async getHealth(@Res({ passthrough: true }) response: Response) {
    const health = await this.healthService.getHealth();

    if (health.status === 'error') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }
}
