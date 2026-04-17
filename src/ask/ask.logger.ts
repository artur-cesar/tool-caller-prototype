import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LlmMessage, LlmResponse } from '../llm/types/llm.types';
import { isProduction, summarizeMessages } from '../utils';

@Injectable()
export class AskLogger {
  private readonly logger = new Logger(AskLogger.name);

  constructor(private readonly configService: ConfigService) {}

  llmRequest(stage: 'initial' | 'follow-up', messages: LlmMessage[]) {
    this.logger.log(`Calling LLM for ${stage} ask flow`);
    this.debug(`${stage} messages`, summarizeMessages(messages));
  }

  llmResponse(stage: 'initial' | 'follow-up', response: LlmResponse) {
    this.logger.log(
      `Received ${response.type} from LLM during ${stage} ask flow`,
    );
    this.debug(`${stage} LLM response`, response);
  }

  toolExecution(toolName: string, orderId: string) {
    this.logger.log(
      `Executing tool ${toolName} for order ${this.maskOrderId(orderId)}`,
    );
  }

  toolResult(result: unknown) {
    this.debug('Tool result', result);
  }

  private debug(message: string, payload: unknown) {
    if (!isProduction(this.configService)) {
      this.logger.debug(`${message}: ${JSON.stringify(payload)}`);
    }
  }

  private maskOrderId(orderId: string) {
    if (orderId.length <= 2) {
      return orderId;
    }

    return `${'*'.repeat(Math.max(orderId.length - 2, 1))}${orderId.slice(-2)}`;
  }
}
