import { Injectable } from '@nestjs/common';

import { LlmMessage } from '../../llm/types/llm.types';
import { Message } from '../../message/message.entity';
import { MessageRole } from '../../message/message-role.enum';

@Injectable()
export class ConversationMessageMapper {
  map(message: Message): LlmMessage {
    if (message.role === MessageRole.USER) {
      return {
        role: 'user',
        content: message.content,
      };
    }

    if (message.role === MessageRole.ASSISTANT) {
      return {
        role: 'assistant',
        content: message.content,
        ...(message.toolName ? { toolName: message.toolName } : {}),
        ...(message.toolUseId ? { toolUseId: message.toolUseId } : {}),
      };
    }

    return {
      role: 'tool',
      content: message.content,
      ...(message.toolName ? { toolName: message.toolName } : {}),
      ...(message.toolUseId ? { toolUseId: message.toolUseId } : {}),
    };
  }
}
