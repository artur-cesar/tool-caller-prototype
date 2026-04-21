import { Injectable } from '@nestjs/common';

import { ConversationAccessService } from '../conversation/conversation-access.service';
import { ProviderApiKeyService } from '../llm/provider-api-key.service';
import { MessageService } from '../message/message.service';
import { TurnRunnerService } from '../turn/turn-runner.service';
import { AskResponse } from './ask.types';
import { AskMode } from './ask-mode.enum';
import { resolveSystemPromptByMode } from './prompts/system.prompt';

@Injectable()
export class AskService {
  constructor(
    private readonly conversationAccessService: ConversationAccessService,
    private readonly messageService: MessageService,
    private readonly turnRunnerService: TurnRunnerService,
    private readonly providerApiKeyService: ProviderApiKeyService,
  ) {}

  async handle(input: {
    userId: string;
    message: string;
    conversationId?: string;
    mode?: AskMode;
    providerApiKey?: string;
  }): Promise<AskResponse> {
    const mode = input.mode ?? AskMode.ORDER_FULL;
    const systemPrompt = resolveSystemPromptByMode(mode);
    const providerApiKey = this.providerApiKeyService.resolve(
      input.providerApiKey,
    );
    const conversation = await this.conversationAccessService.findOrCreate(
      input.userId,
      input.conversationId,
      systemPrompt,
    );

    await this.messageService.createUserMessage(conversation.id, input.message);

    return this.turnRunnerService.run(
      conversation,
      systemPrompt,
      providerApiKey,
    );
  }
}
