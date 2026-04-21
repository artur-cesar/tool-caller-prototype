import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { PROVIDER_API_KEY_HEADER } from '../../llm/provider-api-key.constants';

function normalizeHeader(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function resolveProviderApiKeyHeader(ctx: ExecutionContext) {
  const request = ctx.switchToHttp().getRequest<{
    headers: Record<string, string | string[] | undefined>;
  }>();

  return normalizeHeader(request.headers[PROVIDER_API_KEY_HEADER]);
}

export const ProviderApiKeyHeader = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => resolveProviderApiKeyHeader(ctx),
);
