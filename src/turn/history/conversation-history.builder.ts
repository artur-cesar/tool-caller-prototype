import { Injectable } from '@nestjs/common';

import { ORDER_FULL_SYSTEM_PROMPT } from '../../ask/prompts/system.prompt';
import { Conversation } from '../../conversation/conversation.entity';
import { LlmMessage } from '../../llm/types/llm.types';
import { MessageService } from '../../message/message.service';
import { ConversationHistoryTruncator } from './conversation-history.truncator';
import { ConversationMessageMapper } from './conversation-message.mapper';

@Injectable()
export class ConversationHistoryBuilder {
  constructor(
    private readonly messageService: MessageService,
    private readonly messageMapper: ConversationMessageMapper,
    private readonly truncator: ConversationHistoryTruncator,
  ) {}

  async build(
    conversation: Pick<Conversation, 'id' | 'systemPrompt'>,
    systemPrompt = conversation.systemPrompt || ORDER_FULL_SYSTEM_PROMPT,
  ) {
    const history = await this.messageService.listByConversationId(
      conversation.id,
    );

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...history.map((message) => this.messageMapper.map(message)),
    ];

    return this.truncator.truncate(messages);
  }
}
