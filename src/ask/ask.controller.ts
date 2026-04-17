import { Body, Controller, Headers, Post } from '@nestjs/common';

import { AskService } from './ask.service';
import { AskDto } from './dto/ask.dto';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  async handle(@Body() body: AskDto, @Headers('x-user-id') userId?: string) {
    return this.askService.handle({
      userId,
      message: body.message,
      conversationId: body.conversationId,
    });
  }
}
