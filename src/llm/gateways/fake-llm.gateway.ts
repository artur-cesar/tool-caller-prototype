import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  ORDER_FULL_SYSTEM_PROMPT,
  ORDER_STATUS_ONLY_SYSTEM_PROMPT,
} from '../../ask/prompts/system.prompt';
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
    providerApiKey?: string;
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

      const result = JSON.parse(lastToolMessage.content) as
        | {
            orderId: string;
            status: string;
          }
        | {
            orderId: string;
            found: boolean;
            items: string[];
          };

      this.debug('Parsed tool result', result);

      if (lastToolMessage.toolName === 'getOrderItems') {
        if (!('found' in result) || !result.found) {
          return {
            type: 'final_answer',
            content: `I could not find items for order ${result.orderId}.`,
          };
        }

        return {
          type: 'final_answer',
          content: `Order ${result.orderId} items: ${result.items.join(', ')}.`,
        };
      }

      if (!('status' in result)) {
        return {
          type: 'final_answer',
          content: 'I could not interpret the order status result.',
        };
      }

      return {
        type: 'final_answer',
        content: `Order ${result.orderId} status: ${result.status}.`,
      };
    }

    const systemMessage =
      input.messages.find((message) => message.role === 'system')?.content ??
      ORDER_FULL_SYSTEM_PROMPT;
    const isStatusOnlyMode = systemMessage === ORDER_STATUS_ONLY_SYSTEM_PROMPT;
    const nonSystemMessages = input.messages.filter(
      (message) => message.role !== 'system',
    );
    const lastUserMessage =
      [...nonSystemMessages].reverse().find((m) => m.role === 'user')
        ?.content ?? '';
    const previousMessages = nonSystemMessages.slice(0, -1);

    const normalized = lastUserMessage.toLowerCase();
    const latestOrderId = normalized.match(/\b\d{3,}\b/)?.[0];
    const previousOrderId = [...previousMessages]
      .reverse()
      .map((message) => message.content.match(/\b\d{3,}\b/)?.[0])
      .find(Boolean);
    const refersToPreviousOrder =
      /\b(this|that|same)\s+order\b/i.test(lastUserMessage) ||
      /\b(este|esse|mesmo|desse|deste)\s+pedido\b/i.test(lastUserMessage);
    const orderId =
      latestOrderId ?? (refersToPreviousOrder ? previousOrderId : undefined);
    const mentionsOrder =
      normalized.includes('pedido') || normalized.includes('order');
    const wantsOrderItems =
      normalized.includes('item') || normalized.includes('items');
    const wantsOrderStatus = normalized.includes('status');
    const isCompositeOrderRequest = wantsOrderStatus && wantsOrderItems;
    const isContinuingOrderItemsLookup = previousMessages.some(
      (message) =>
        message.role === 'user' && /item|items/i.test(message.content),
    );
    const isClarifyingOrderLookup =
      previousMessages.some((message) => {
        if (message.role === 'user') {
          const content = message.content.toLowerCase();

          return (
            content.includes('pedido') ||
            content.includes('order') ||
            content.includes('status') ||
            content.includes('item') ||
            content.includes('items')
          );
        }

        return false;
      }) &&
      previousMessages.some(
        (message) =>
          message.role === 'assistant' &&
          /which order|qual pedido|de qual order|de qual pedido/i.test(
            message.content,
          ),
      );

    this.debug('Last user message', truncate(lastUserMessage));
    this.debug('Order detection', {
      wantsOrderItems,
      wantsOrderStatus,
      isCompositeOrderRequest,
      isContinuingOrderItemsLookup,
      isClarifyingOrderLookup,
      orderId,
      isStatusOnlyMode,
    });

    if (isStatusOnlyMode && (wantsOrderItems || isContinuingOrderItemsLookup)) {
      return {
        type: 'final_answer',
        content:
          'I can only help with order status in this mode. I do not have the necessary capability to answer order item requests.',
      };
    }

    if (isCompositeOrderRequest) {
      return {
        type: 'final_answer',
        content:
          'This prototype handles one backend tool action at a time. Please ask for either order status or order items.',
      };
    }

    if (
      ((mentionsOrder && wantsOrderStatus) ||
        wantsOrderItems ||
        isClarifyingOrderLookup) &&
      orderId
    ) {
      if (wantsOrderItems) {
        this.logger.log('Fake LLM is issuing an items tool call');
        return {
          type: 'tool_call',
          content: "I'll check the order items for you.",
          toolName: 'getOrderItems',
          toolUseId: 'fake-tool-use-id',
          arguments: {
            orderId,
          },
        };
      }

      if (isContinuingOrderItemsLookup) {
        this.logger.log('Fake LLM is continuing an items lookup');
        return {
          type: 'tool_call',
          content: "I'll check the order items for you.",
          toolName: 'getOrderItems',
          toolUseId: 'fake-tool-use-id',
          arguments: {
            orderId,
          },
        };
      }

      this.logger.log('Fake LLM is issuing a tool call');
      return {
        type: 'tool_call',
        content: "I'll check the order status for you.",
        toolName: 'getOrderStatus',
        toolUseId: 'fake-tool-use-id',
        arguments: {
          orderId,
        },
      };
    }

    if ((wantsOrderStatus || wantsOrderItems || mentionsOrder) && !orderId) {
      return {
        type: 'final_answer',
        content: 'Which order?',
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
