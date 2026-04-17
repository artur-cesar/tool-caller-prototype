import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Message } from './message.entity';
import { MessageRole } from './message-role.enum';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  createUserMessage(conversationId: string, content: string) {
    return this.createMessage({
      conversationId,
      role: MessageRole.USER,
      content,
      toolName: null,
      toolUseId: null,
    });
  }

  createAssistantMessage(conversationId: string, content: string) {
    return this.createMessage({
      conversationId,
      role: MessageRole.ASSISTANT,
      content,
      toolName: null,
      toolUseId: null,
    });
  }

  createToolMessage(
    conversationId: string,
    toolName: string,
    toolUseId: string,
    content: string,
  ) {
    return this.createMessage({
      conversationId,
      role: MessageRole.TOOL,
      content,
      toolName,
      toolUseId,
    });
  }

  listByConversationId(conversationId: string) {
    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  private createMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    toolName: string | null;
    toolUseId: string | null;
  }) {
    const message = this.messageRepository.create(input);

    return this.messageRepository.save(message);
  }
}
