import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Conversation } from '../conversation/conversation.entity';
import { MessageRole } from './message-role.enum';

@Entity({ name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({
    type: 'enum',
    enum: MessageRole,
    enumName: 'message_role_enum',
  })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', nullable: true })
  toolName: string | null;

  @Column({ type: 'varchar', nullable: true })
  toolUseId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
