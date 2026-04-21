import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

import { AskMode } from '../ask-mode.enum';

export class AskDto {
  @ApiProperty({
    description:
      'Latest user message. Ask about order status, order items, or answer a clarification question.',
    example: 'I would like to know the status of my order 123',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  message: string;

  @ApiPropertyOptional({
    description:
      'Existing conversation ID used to continue a multi-turn conversation. Omit it to create a new conversation.',
    example: '97a10983-d1c2-4532-8c91-b94056e10b0a',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description:
      'Ask mode used to select the internal system prompt. ORDER_STATUS_ONLY restricts the assistant to order status support. ORDER_FULL allows order status and order item support.',
    enum: AskMode,
    default: AskMode.ORDER_FULL,
    example: AskMode.ORDER_FULL,
  })
  @IsOptional()
  @IsEnum(AskMode)
  mode?: AskMode;
}
