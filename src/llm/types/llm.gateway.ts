import { ToolDefinition } from '../../tools/tools.type';
import { LlmMessage, LlmResponse } from './llm.types';

export interface LlmGateway {
  generate(input: {
    messages: LlmMessage[];
    tools?: ToolDefinition[];
  }): Promise<LlmResponse>;
}

export const LLM_GATEWAY = Symbol('LLM_GATEWAY');
