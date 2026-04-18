import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Conversation } from './conversation.entity';
import { ConversationService } from './conversation.service';
import { ConversationAccessService } from './conversation-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation])],
  providers: [ConversationService, ConversationAccessService],
  exports: [ConversationService, ConversationAccessService],
})
export class ConversationModule {}
