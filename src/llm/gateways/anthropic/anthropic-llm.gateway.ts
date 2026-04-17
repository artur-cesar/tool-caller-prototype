import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LlmGateway } from '../../types/llm.gateway';
import { LlmGenerateInput, LlmResponse } from '../../types/llm.types';
import { AnthropicLogger } from './anthropic.logger';
import { AnthropicMappedMessage, AnthropicModel } from './types';
import { mapAnthropicMessage, resolveModel } from './utils.mapper';

@Injectable()
export class AnthropicLlmGateway implements LlmGateway {
  private readonly client: Anthropic;
  private readonly model: AnthropicModel;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AnthropicLogger,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
    this.model = resolveModel(
      this.configService.get<string>('ANTHROPIC_MODEL'),
    );
  }

  async generate({ messages, tools }: LlmGenerateInput): Promise<LlmResponse> {
    this.logger.outboundRequest(messages, tools);

    const systemMessage = messages.find((m) => m.role === 'system')?.content;

    // Claude expects messages without "system" in the main array.
    // The system prompt is sent in a separate field.
    const mappedMessages: AnthropicMappedMessage[] = messages
      .filter((message) => message.role !== 'system')
      .map((message) => mapAnthropicMessage(message));

    this.logger.mappedRequest(systemMessage, mappedMessages, tools);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: systemMessage,
      messages: mappedMessages,
      tools: tools?.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      })),
    });

    this.logger.inboundResponse(response);

    // Claude requested a tool call.
    const toolUseBlock = response.content.find(
      (block) => block.type === 'tool_use',
    );
    this.logger.debug('Tool use block', toolUseBlock);

    if (toolUseBlock && toolUseBlock.type === 'tool_use') {
      const textBlock = response.content.find((block) => block.type === 'text');
      this.logger.toolRequest(toolUseBlock.name, textBlock);

      return {
        type: 'tool_call',
        content:
          textBlock && textBlock.type === 'text' ? textBlock.text : undefined,
        toolName: toolUseBlock.name,
        toolUseId: toolUseBlock.id,
        arguments: toolUseBlock.input as Record<string, unknown>,
      };
    }

    // Claude returned a regular text response.
    const textBlock = response.content.find((block) => block.type === 'text');
    this.logger.finalText(textBlock);

    return {
      type: 'final_answer',
      content:
        textBlock && textBlock.type === 'text'
          ? textBlock.text
          : 'I could not generate a response.',
    };
  }
}
