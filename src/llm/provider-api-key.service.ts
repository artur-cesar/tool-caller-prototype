import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PROVIDER_API_KEY_HEADER } from './provider-api-key.constants';

@Injectable()
export class ProviderApiKeyService {
  constructor(private readonly configService: ConfigService) {}

  resolve(requestApiKey?: string): string {
    const headerApiKey = this.normalize(requestApiKey);

    if (headerApiKey) {
      return headerApiKey;
    }

    const environmentApiKey = this.normalize(
      this.configService.get<string>('ANTHROPIC_API_KEY'),
    );

    if (environmentApiKey) {
      return environmentApiKey;
    }

    throw new UnauthorizedException(
      `Provider API key is required. Send ${PROVIDER_API_KEY_HEADER} or configure ANTHROPIC_API_KEY.`,
    );
  }

  private normalize(value?: string) {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }
}
