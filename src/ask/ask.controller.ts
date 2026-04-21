import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { ApiProviderApiKey } from '../common/decorators/api-provider-api-key.decorator';
import { ApiUserScopedEndpoint } from '../common/decorators/api-user-scoped-endpoint.decorator';
import { ProviderApiKeyHeader } from '../common/decorators/provider-api-key-header.decorator';
import { UserIdHeader } from '../common/decorators/user-id-header.decorator';
import { AskService } from './ask.service';
import { AskDto } from './dto/ask.dto';
import { AskResponseDto } from './dto/ask-response.dto';

@ApiTags('Ask')
@ApiSecurity('x-user-id')
@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  @ApiOperation({
    summary: 'Ask the order support assistant a question',
    description:
      'Creates or continues a persisted conversation, sends the selected internal system prompt and the same runtime tool list to the LLM, and returns the final assistant answer.',
  })
  @ApiUserScopedEndpoint()
  @ApiProviderApiKey()
  @ApiBody({ type: AskDto })
  @ApiCreatedResponse({
    description:
      'Final assistant answer. If the model requested a tool, the response is returned after the tool result follow-up call.',
    type: AskResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'The provided conversationId does not exist.',
  })
  async handle(
    @Body() body: AskDto,
    @UserIdHeader() userId: string,
    @ProviderApiKeyHeader() providerApiKey?: string,
  ) {
    return this.askService.handle({
      userId,
      message: body.message,
      conversationId: body.conversationId,
      mode: body.mode,
      providerApiKey,
    });
  }
}
