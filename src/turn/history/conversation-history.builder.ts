import { Injectable } from '@nestjs/common';

import { ASK_SYSTEM_PROMPT } from '../../ask/prompts/system.prompt';
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

  async build(conversation: Pick<Conversation, 'id' | 'systemPrompt'>) {
    const history = await this.messageService.listByConversationId(
      conversation.id,
    );

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: conversation.systemPrompt || ASK_SYSTEM_PROMPT,
      },
      ...history.map((message) => this.messageMapper.map(message)),
    ];

    return this.truncator.truncate(messages);
  }
}
