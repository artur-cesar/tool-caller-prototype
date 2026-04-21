import { ToolDefinition } from '../../tools/tools.type';
import { LlmMessage, LlmResponse } from './llm.types';

export interface LlmGateway {
  generate(input: {
    messages: LlmMessage[];
    tools?: ToolDefinition[];
    providerApiKey: string;
  }): Promise<LlmResponse>;
}

export const LLM_GATEWAY = Symbol('LLM_GATEWAY');
