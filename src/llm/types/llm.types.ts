import { ToolDefinition } from '../../tools/tools.type';

export type LlmMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolUseId?: string;
  toolArguments?: Record<string, unknown>;
};

export type LlmGenerateInput = {
  messages: LlmMessage[];
  tools?: ToolDefinition[];
};

export type LlmToolCallResponse = {
  type: 'tool_call';
  content?: string;
  toolName: string;
  toolUseId?: string;
  arguments: Record<string, unknown>;
};

export type LlmFinalResponse = {
  type: 'final_answer';
  content: string;
};

export type LlmResponse = LlmToolCallResponse | LlmFinalResponse;
