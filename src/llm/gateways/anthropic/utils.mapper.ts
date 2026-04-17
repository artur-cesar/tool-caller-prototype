import { LlmGenerateInput } from '../../types/llm.types';
import {
  ANTHROPIC_MODELS,
  AnthropicAssistantContentBlock,
  AnthropicMappedMessage,
  AnthropicModel,
  AssistantToolUseMessage,
  ToolMessage,
} from './types';

export function mapAnthropicMessage(
  message: LlmGenerateInput['messages'][number],
): AnthropicMappedMessage {
  if (message.role === 'tool' && message.toolUseId) {
    return mapToolMessage(message as ToolMessage);
  }

  if (message.role === 'assistant' && message.toolUseId && message.toolName) {
    return mapAssistantToolUseMessage(message as AssistantToolUseMessage);
  }

  return {
    role: message.role as 'user' | 'assistant',
    content: message.content,
  };
}

export function resolveModel(model?: string): AnthropicModel {
  switch (model) {
    case ANTHROPIC_MODELS.OPUS:
    case ANTHROPIC_MODELS.SONNET:
    case ANTHROPIC_MODELS.HAIKU:
      return model;
    case undefined:
    case '':
      return ANTHROPIC_MODELS.HAIKU;
    default:
      throw new Error(`Unsupported Anthropic model: ${model}`);
  }
}

function mapToolMessage(message: ToolMessage): AnthropicMappedMessage {
  return {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: message.toolUseId,
        content: message.content,
      },
    ],
  };
}

function mapAssistantToolUseMessage(
  message: AssistantToolUseMessage,
): AnthropicMappedMessage {
  const content: AnthropicAssistantContentBlock[] = [];

  if (message.content) {
    content.push({
      type: 'text',
      text: message.content,
    });
  }

  content.push({
    type: 'tool_use',
    id: message.toolUseId,
    name: message.toolName,
    input: message.toolArguments ?? {},
  });

  return {
    role: 'assistant',
    content,
  };
}
