import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { isProduction, summarizeMessages, truncate } from '../../../utils';
import { LlmGenerateInput } from '../../types/llm.types';
import { AnthropicMappedMessage } from './types';

@Injectable()
export class AnthropicLogger {
  private readonly logger = new Logger(AnthropicLogger.name);

  constructor(private readonly configService: ConfigService) {}

  outboundRequest(
    messages: LlmGenerateInput['messages'],
    tools: LlmGenerateInput['tools'],
  ) {
    this.logger.log('Sending request to Anthropic');
    this.debug('Messages', summarizeMessages(messages));
    this.debug(
      'Tools',
      tools?.map((tool) => ({
        name: tool.name,
        description: truncate(tool.description, 80),
      })),
    );
  }

  mappedRequest(
    systemMessage: string | undefined,
    mappedMessages: AnthropicMappedMessage[],
    tools: LlmGenerateInput['tools'],
  ) {
    this.debug('System message', truncate(systemMessage ?? ''));
    this.debug('Mapped messages', mappedMessages);
    this.debug('Tool count', tools?.length ?? 0);
  }

  inboundResponse(response: {
    id: string;
    model: string;
    stop_reason: string | null;
    content: Array<{ type: string }>;
  }) {
    this.logger.log(
      `Anthropic responded with stop reason ${response.stop_reason ?? 'none'}`,
    );
    this.debug('Raw response summary', {
      id: response.id,
      model: response.model,
      stopReason: response.stop_reason,
      contentTypes: response.content.map((block) => block.type),
    });
  }

  debug(message: string, payload: unknown) {
    if (!isProduction(this.configService)) {
      this.logger.debug(`${message}: ${JSON.stringify(payload)}`);
    }
  }

  toolRequest(toolName: string, textBlock: unknown) {
    this.logger.log(`Anthropic requested tool ${toolName}`);
    this.debug('Text block before tool call', textBlock);
  }

  finalText(textBlock: unknown) {
    this.logger.log('Anthropic returned a final answer');
    this.debug('Final text block', textBlock);
  }
}
