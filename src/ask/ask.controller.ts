import { Body, Controller, Post } from '@nestjs/common';

import { UserIdHeader } from '../common/decorators/user-id-header.decorator';
import { AskService } from './ask.service';
import { AskDto } from './dto/ask.dto';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  async handle(@Body() body: AskDto, @UserIdHeader() userId: string) {
    return this.askService.handle({
      userId,
      message: body.message,
      conversationId: body.conversationId,
    });
  }
}
