import { applyDecorators } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { PROVIDER_API_KEY_SECURITY_SCHEME } from '../../llm/provider-api-key.constants';

export function ApiProviderApiKey() {
  return applyDecorators(
    ApiSecurity(PROVIDER_API_KEY_SECURITY_SCHEME),
    ApiUnauthorizedResponse({
      description:
        'Provider API key is missing. Send x-provider-api-key or configure ANTHROPIC_API_KEY.',
    }),
  );
}
