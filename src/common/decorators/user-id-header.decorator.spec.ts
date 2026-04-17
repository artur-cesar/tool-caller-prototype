import { BadRequestException, ExecutionContext } from '@nestjs/common';

import { resolveUserIdHeader } from './user-id-header.decorator';

describe('UserIdHeader', () => {
  function createExecutionContext(
    userId?: string | string[],
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-user-id': userId,
          },
        }),
      }),
    } as ExecutionContext;
  }

  it('should return the x-user-id header when present', () => {
    const userId = resolveUserIdHeader(createExecutionContext('user-1'));

    expect(userId).toBe('user-1');
  });

  it('should return the first value when x-user-id is an array', () => {
    const userId = resolveUserIdHeader(
      createExecutionContext(['user-1', 'user-2']),
    );

    expect(userId).toBe('user-1');
  });

  it('should throw when x-user-id is missing', () => {
    expect(() => resolveUserIdHeader(createExecutionContext())).toThrow(
      BadRequestException,
    );
  });
});
