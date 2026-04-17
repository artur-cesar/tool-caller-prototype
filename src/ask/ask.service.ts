import { Inject, Injectable } from '@nestjs/common';
import { OrderRepository } from 'src/order/order.repository';

import type { LlmGateway } from '../llm/types/llm.gateway';
import { LLM_GATEWAY } from '../llm/types/llm.gateway';
import { LlmMessage, LlmResponse } from '../llm/types/llm.types';
import { tools } from '../tools/tools-definition';
import { AskLogger } from './ask.logger';

@Injectable()
export class AskService {
  constructor(
    @Inject(LLM_GATEWAY) private readonly llmGateway: LlmGateway,
    private readonly orderRepository: OrderRepository,
    private readonly logger: AskLogger,
  ) {}

  async handle(message: string): Promise<LlmResponse> {
    const messages: LlmMessage[] = [
      {
        role: 'system',
        content:
          'You are a study assistant for experiments with LLM providers.',
      },
      {
        role: 'user',
        content: message,
      },
    ];

    this.logger.llmRequest('initial', messages);

    const llmResponse = await this.llmGateway.generate({
      messages,
      tools,
    });

    this.logger.llmResponse('initial', llmResponse);

    if (llmResponse.type === 'final_answer') {
      return llmResponse;
    }

    if (llmResponse.toolName !== 'getOrderStatus') {
      return {
        type: 'final_answer',
        content: `Tool ${llmResponse.toolName} is not supported.`,
      };
    }

    this.logger.toolExecution(
      llmResponse.toolName,
      String(llmResponse.arguments.orderId),
    );

    const result = this.orderRepository.getOrderStatus(
      String(llmResponse.arguments.orderId),
    );

    this.logger.toolResult(result);

    const followUpMessages: LlmMessage[] = [
      ...messages,
      {
        role: 'assistant',
        content: llmResponse.content ?? '',
        toolName: llmResponse.toolName,
        toolUseId: llmResponse.toolUseId,
        toolArguments: llmResponse.arguments,
      },
      {
        role: 'tool',
        toolName: llmResponse.toolName,
        toolUseId: llmResponse.toolUseId,
        content: JSON.stringify(result),
      },
    ];

    this.logger.llmRequest('follow-up', followUpMessages);

    const finalResponse = await this.llmGateway.generate({
      messages: followUpMessages,
      tools,
    });

    this.logger.llmResponse('follow-up', finalResponse);

    return finalResponse;
  }
}
