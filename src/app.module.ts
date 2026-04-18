import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AskController } from './ask/ask.controller';
import { AskLogger } from './ask/ask.logger';
import { AskService } from './ask/ask.service';
import { ConversationModule } from './conversation/conversation.module';
import { DatabaseModule } from './database/database.module';
import { AnthropicLogger } from './llm/gateways/anthropic/anthropic.logger';
import { AnthropicLlmGateway } from './llm/gateways/anthropic/anthropic-llm.gateway';
import { LLM_GATEWAY } from './llm/types/llm.gateway';
import { MessageModule } from './message/message.module';
import { OrderRepository } from './order/order.repository';
import { ToolExecutorService } from './tools/tool-executor.service';
import { ConversationHistoryBuilder } from './turn/history/conversation-history.builder';
import { ConversationHistoryTruncator } from './turn/history/conversation-history.truncator';
import { ConversationMessageMapper } from './turn/history/conversation-message.mapper';
import { TurnRunnerService } from './turn/turn-runner.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule.register(),
    ConversationModule,
    MessageModule,
  ],
  controllers: [AppController, AskController],
  providers: [
    AppService,
    AskLogger,
    AskService,
    ConversationHistoryBuilder,
    ConversationHistoryTruncator,
    ConversationMessageMapper,
    ToolExecutorService,
    TurnRunnerService,
    AnthropicLogger,
    OrderRepository,
    {
      provide: LLM_GATEWAY,
      useClass: AnthropicLlmGateway,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
