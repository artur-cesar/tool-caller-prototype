import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

function normalizeUserId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function resolveUserIdHeader(ctx: ExecutionContext) {
  const request = ctx.switchToHttp().getRequest<{
    headers: Record<string, string | string[] | undefined>;
  }>();
  const userId = normalizeUserId(request.headers['x-user-id']);

  if (!userId) {
    throw new BadRequestException('x-user-id header is required.');
  }

  return userId;
}

export const UserIdHeader = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => resolveUserIdHeader(ctx),
);
