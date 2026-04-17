import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderRepository } from 'src/order/order.repository';

import { ConversationService } from '../conversation/conversation.service';
import type { LlmGateway } from '../llm/types/llm.gateway';
import { LLM_GATEWAY } from '../llm/types/llm.gateway';
import { LlmMessage } from '../llm/types/llm.types';
import { Message } from '../message/message.entity';
import { MessageService } from '../message/message.service';
import { MessageRole } from '../message/message-role.enum';
import { tools } from '../tools/tools-definition';
import { AskLogger } from './ask.logger';
import { AskResponse } from './ask.types';
import { ASK_SYSTEM_PROMPT } from './prompts/system.prompt';

@Injectable()
export class AskService {
  constructor(
    @Inject(LLM_GATEWAY) private readonly llmGateway: LlmGateway,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly orderRepository: OrderRepository,
    private readonly logger: AskLogger,
  ) {}

  async handle(input: {
    userId?: string;
    message: string;
    conversationId?: string;
  }): Promise<AskResponse> {
    const userId = this.validateUserId(input.userId);
    const conversation = await this.resolveConversation(
      userId,
      input.conversationId,
    );

    await this.messageService.createUserMessage(conversation.id, input.message);

    const messages = await this.buildConversationMessages(conversation.id);

    this.logger.llmRequest('initial', messages);

    const llmResponse = await this.llmGateway.generate({
      messages,
      tools,
    });

    this.logger.llmResponse('initial', llmResponse);

    if (llmResponse.type === 'final_answer') {
      await this.messageService.createAssistantMessage(
        conversation.id,
        llmResponse.content,
      );

      return {
        conversationId: conversation.id,
        type: 'final_answer',
        content: llmResponse.content,
      };
    }

    await this.messageService.createAssistantToolCallMessage(
      conversation.id,
      llmResponse.content ?? '',
      llmResponse.toolName,
      llmResponse.toolUseId ?? null,
    );

    if (llmResponse.toolName !== 'getOrderStatus') {
      const content = `Tool ${llmResponse.toolName} is not supported.`;

      await this.messageService.createAssistantMessage(
        conversation.id,
        content,
      );

      return {
        conversationId: conversation.id,
        type: 'final_answer',
        content,
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

    await this.messageService.createToolMessage(
      conversation.id,
      llmResponse.toolName,
      llmResponse.toolUseId ?? null,
      JSON.stringify(result),
    );

    const followUpMessages = await this.buildConversationMessages(
      conversation.id,
    );

    this.logger.llmRequest('follow-up', followUpMessages);

    const finalResponse = await this.llmGateway.generate({
      messages: followUpMessages,
      tools,
    });

    this.logger.llmResponse('follow-up', finalResponse);

    const content =
      finalResponse.type === 'final_answer'
        ? finalResponse.content
        : 'I could not generate a final answer.';

    await this.messageService.createAssistantMessage(conversation.id, content);

    return {
      conversationId: conversation.id,
      type: 'final_answer',
      content,
    };
  }

  private validateUserId(userId?: string) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required.');
    }

    return userId;
  }

  private async resolveConversation(userId: string, conversationId?: string) {
    if (!conversationId) {
      return this.conversationService.create(userId);
    }

    const conversation =
      await this.conversationService.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException(
        `Conversation ${conversationId} was not found.`,
      );
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this conversation.',
      );
    }

    return conversation;
  }

  private async buildConversationMessages(
    conversationId: string,
  ): Promise<LlmMessage[]> {
    const history =
      await this.messageService.listByConversationId(conversationId);

    return [
      {
        role: 'system',
        content: ASK_SYSTEM_PROMPT,
      },
      ...history.flatMap((message) => this.mapMessageToLlmMessage(message)),
    ];
  }

  private mapMessageToLlmMessage(message: Message): LlmMessage[] {
    if (message.role === MessageRole.USER) {
      return [
        {
          role: 'user',
          content: message.content,
        },
      ];
    }

    if (message.role === MessageRole.ASSISTANT) {
      return [
        {
          role: 'assistant',
          content: message.content,
          ...(message.toolName ? { toolName: message.toolName } : {}),
          ...(message.toolUseId ? { toolUseId: message.toolUseId } : {}),
        },
      ];
    }

    if (message.role === MessageRole.TOOL) {
      return [
        {
          role: 'tool',
          content: message.content,
          ...(message.toolName ? { toolName: message.toolName } : {}),
          ...(message.toolUseId ? { toolUseId: message.toolUseId } : {}),
        },
      ];
    }

    return [];
  }
}
