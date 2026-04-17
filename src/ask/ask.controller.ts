import { Body, Controller, Post } from '@nestjs/common';

import { AskService } from './ask.service';
import { AskDto } from './dto/ask.dto';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  async handle(@Body() body: AskDto) {
    return this.askService.handle(body.message);
  }
}
