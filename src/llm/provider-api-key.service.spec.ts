import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ProviderApiKeyService } from './provider-api-key.service';

describe('ProviderApiKeyService', () => {
  let configService: { get: jest.Mock };
  let service: ProviderApiKeyService;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    };
    service = new ProviderApiKeyService(
      configService as unknown as ConfigService,
    );
  });

  it('should prefer the request provider api key over environment fallback', () => {
    configService.get.mockReturnValue('environment-api-key');

    const result = service.resolve('request-api-key');

    expect(result).toBe('request-api-key');
    expect(configService.get).not.toHaveBeenCalled();
  });

  it('should use environment provider api key when request header is missing', () => {
    configService.get.mockReturnValue('environment-api-key');

    const result = service.resolve();

    expect(result).toBe('environment-api-key');
    expect(configService.get).toHaveBeenCalledWith('ANTHROPIC_API_KEY');
  });

  it('should fail clearly when no provider api key source is available', () => {
    configService.get.mockReturnValue(undefined);

    expect(() => service.resolve('   ')).toThrow(UnauthorizedException);
    expect(() => service.resolve('   ')).toThrow(
      'Provider API key is required. Send x-provider-api-key or configure ANTHROPIC_API_KEY.',
    );
  });
});
