import { Inject, Injectable } from '@nestjs/common';

import { AskLogger } from '../ask/ask.logger';
import { AskResponse } from '../ask/ask.types';
import { Conversation } from '../conversation/conversation.entity';
import type { LlmGateway } from '../llm/types/llm.gateway';
import { LLM_GATEWAY } from '../llm/types/llm.gateway';
import { MessageService } from '../message/message.service';
import { ToolExecutorService } from '../tools/tool-executor.service';
import { tools } from '../tools/tools-definition';
import { ConversationHistoryBuilder } from './history/conversation-history.builder';

@Injectable()
export class TurnRunnerService {
  constructor(
    @Inject(LLM_GATEWAY) private readonly llmGateway: LlmGateway,
    private readonly historyBuilder: ConversationHistoryBuilder,
    private readonly messageService: MessageService,
    private readonly toolExecutorService: ToolExecutorService,
    private readonly logger: AskLogger,
  ) {}

  async run(conversation: Conversation): Promise<AskResponse> {
    const messages = await this.historyBuilder.build(conversation);

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

    const toolExecution = this.toolExecutorService.execute(
      llmResponse.toolName,
      llmResponse.arguments,
    );

    if (!toolExecution.supported) {
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
    this.logger.toolResult(toolExecution.result);

    await this.messageService.createToolMessage(
      conversation.id,
      llmResponse.toolName,
      llmResponse.toolUseId ?? null,
      JSON.stringify(toolExecution.result),
    );

    const followUpMessages = await this.historyBuilder.build(conversation);

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
}
