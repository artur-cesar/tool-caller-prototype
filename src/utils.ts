import { ConfigService } from '@nestjs/config';

type MessageLike = {
  role: string;
  content: string;
  toolName?: string;
  toolUseId?: string;
};

export function isProduction(configService: ConfigService) {
  return configService.get<string>('NODE_ENV') === 'production';
}

export function isLocal(configService: ConfigService) {
  const environment = configService.get<string>('NODE_ENV');
  return environment === 'local';
}

export function truncate(value: string, maxLength = 120) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

export function summarizeMessages<T extends MessageLike>(messages: T[]) {
  return messages.map((message) => ({
    role: message.role,
    toolName: message.toolName,
    toolUseId: message.toolUseId,
    contentPreview: truncate(message.content),
  }));
}
