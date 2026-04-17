import { LlmGenerateInput } from '../../types/llm.types';

export const ANTHROPIC_MODELS = {
  OPUS: 'claude-opus-4-7',
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5',
} as const;

export type AnthropicModel =
  (typeof ANTHROPIC_MODELS)[keyof typeof ANTHROPIC_MODELS];

export type AnthropicToolResultContentBlock = {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
};

export type AnthropicTextContentBlock = {
  type: 'text';
  text: string;
};

export type AnthropicToolUseContentBlock = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type AnthropicAssistantContentBlock =
  | AnthropicTextContentBlock
  | AnthropicToolUseContentBlock;

export type ToolMessage = LlmGenerateInput['messages'][number] & {
  role: 'tool';
  toolUseId: string;
};

export type AssistantToolUseMessage = LlmGenerateInput['messages'][number] & {
  role: 'assistant';
  toolUseId: string;
  toolName: string;
};

export type AnthropicMappedMessage =
  | {
      role: 'user' | 'assistant';
      content: string;
    }
  | {
      role: 'user';
      content: AnthropicToolResultContentBlock[];
    }
  | {
      role: 'assistant';
      content: AnthropicAssistantContentBlock[];
    };
