import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ASK_SYSTEM_PROMPT } from '../ask/prompts/system.prompt';
import { Conversation } from './conversation.entity';
import { ConversationService } from './conversation.service';

@Injectable()
export class ConversationAccessService {
  constructor(private readonly conversationService: ConversationService) {}

  async findOrCreate(
    userId: string,
    conversationId?: string,
  ): Promise<Conversation> {
    if (!conversationId) {
      return this.conversationService.create(userId, ASK_SYSTEM_PROMPT);
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
}
