import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import {
  PROVIDER_API_KEY_HEADER,
  PROVIDER_API_KEY_SECURITY_SCHEME,
} from './llm/provider-api-key.constants';
import { isProduction } from './utils';

function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Tool Caller Prototype API')
    .setDescription(
      'NestJS backend used to study LLM tool calling, persisted conversations, and prompt-driven ask modes.',
    )
    .setVersion('0.0.1')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-user-id',
        in: 'header',
        description:
          'Application-level user identifier used to track conversation ownership.',
      },
      'x-user-id',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: PROVIDER_API_KEY_HEADER,
        in: 'header',
        description:
          'Optional provider API key for this request. When supplied, it overrides the server ANTHROPIC_API_KEY fallback.',
      },
      PROVIDER_API_KEY_SECURITY_SCHEME,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const isProd = isProduction(configService);

  app.useLogger(
    isProd
      ? ['log', 'error', 'warn']
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  );

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
