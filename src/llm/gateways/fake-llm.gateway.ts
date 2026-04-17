import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ToolDefinition } from '../../tools/tools.type';
import { isProduction, summarizeMessages, truncate } from '../../utils';
import { LlmGateway } from '../types/llm.gateway';
import { LlmMessage, LlmResponse } from '../types/llm.types';

@Injectable()
export class FakeLlmGateway implements LlmGateway {
  private readonly logger = new Logger(FakeLlmGateway.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(input: {
    messages: LlmMessage[];
    tools?: ToolDefinition[];
  }): Promise<LlmResponse> {
    this.logger.log('Processing fake LLM request');
    this.debug('Messages', summarizeMessages(input.messages));
    this.debug(
      'Tools',
      input.tools?.map((tool) => ({
        name: tool.name,
        description: truncate(tool.description, 80),
      })),
    );

    const lastToolMessage = [...input.messages]
      .reverse()
      .find((m) => m.role === 'tool');

    if (lastToolMessage) {
      this.logger.log('Returning final answer from tool result');
      this.debug('Last tool message', lastToolMessage);

      const result = JSON.parse(lastToolMessage.content) as {
        orderId: string;
        status: string;
      };

      this.debug('Parsed tool result', result);

      return {
        type: 'final_answer',
        content: `Order ${result.orderId} status: ${result.status}.`,
      };
    }

    const lastUserMessage =
      [...input.messages].reverse().find((m) => m.role === 'user')?.content ??
      '';

    const normalized = lastUserMessage.toLowerCase();
    const orderIdMatch = normalized.match(/\b\d{3,}\b/);

    const wantsOrderStatus =
      normalized.includes('pedido') ||
      normalized.includes('order') ||
      normalized.includes('status');

    this.debug('Last user message', truncate(lastUserMessage));
    this.debug('Order detection', {
      wantsOrderStatus,
      orderIdMatch: orderIdMatch?.[0],
    });

    if (wantsOrderStatus && orderIdMatch) {
      this.logger.log('Fake LLM is issuing a tool call');
      return {
        type: 'tool_call',
        content: "I'll check the order status for you.",
        toolName: 'getOrderStatus',
        toolUseId: 'fake-tool-use-id',
        arguments: {
          orderId: orderIdMatch[0],
        },
      };
    }

    return {
      type: 'final_answer',
      content:
        'I could not identify a valid order lookup. Try something like: "What is the status of order 123?"',
    };
  }

  private debug(message: string, payload: unknown) {
    if (!isProduction(this.configService)) {
      this.logger.debug(`${message}: ${JSON.stringify(payload)}`);
    }
  }
}
