import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

export function ApiUserScopedEndpoint() {
  return applyDecorators(
    ApiHeader({
      name: 'x-user-id',
      required: true,
      description:
        'Application-level user identifier used to track resource ownership.',
      example: 'user-1',
    }),
    ApiBadRequestResponse({
      description: 'Invalid request or missing x-user-id.',
    }),
    ApiForbiddenResponse({
      description: 'The resource belongs to another user.',
    }),
    ApiInternalServerErrorResponse({
      description: 'Unexpected internal error.',
    }),
  );
}
