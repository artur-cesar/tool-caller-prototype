import { ApiProperty } from '@nestjs/swagger';

export class AskResponseDto {
  @ApiProperty({
    description:
      'Conversation ID created or reused by the request. Send this value in follow-up requests to keep multi-turn context.',
    example: '97a10983-d1c2-4532-8c91-b94056e10b0a',
  })
  conversationId: string;

  @ApiProperty({
    description: 'Response type returned by the ask endpoint.',
    example: 'final_answer',
    enum: ['final_answer'],
  })
  type: 'final_answer';

  @ApiProperty({
    description: 'Final assistant answer generated for the request.',
    example: 'Your order 123 has a status of **PAID**.',
  })
  content: string;
}
