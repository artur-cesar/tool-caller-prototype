import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Conversation } from './conversation.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  create(userId: string) {
    const conversation = this.conversationRepository.create({ userId });

    return this.conversationRepository.save(conversation);
  }

  findById(id: string) {
    return this.conversationRepository.findOne({
      where: { id },
    });
  }

  findByIdAndUserId(id: string, userId: string) {
    return this.conversationRepository.findOne({
      where: { id, userId },
    });
  }
}
