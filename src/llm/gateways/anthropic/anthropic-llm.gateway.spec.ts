import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';

import { AnthropicLogger } from './anthropic.logger';
import { AnthropicLlmGateway } from './anthropic-llm.gateway';

const anthropicConstructorMock = Anthropic as unknown as jest.Mock;

jest.mock('@anthropic-ai/sdk', () => {
  const create = jest.fn();

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create,
      },
    })),
  };
});

describe('AnthropicLlmGateway', () => {
  let gateway: AnthropicLlmGateway;
  let configService: jest.Mocked<ConfigService>;
  let anthropicLogger: jest.Mocked<AnthropicLogger>;
  let createMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ANTHROPIC_MODEL') {
          return 'claude-sonnet-4-6';
        }

        if (key === 'NODE_ENV') {
          return 'test';
        }

        return undefined;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'ANTHROPIC_API_KEY') {
          return 'test-api-key';
        }

        throw new Error(`Missing config for ${key}`);
      }),
    } as unknown as jest.Mocked<ConfigService>;

    anthropicLogger = {
      outboundRequest: jest.fn(),
      mappedRequest: jest.fn(),
      inboundResponse: jest.fn(),
      debug: jest.fn(),
      toolRequest: jest.fn(),
      finalText: jest.fn(),
    } as unknown as jest.Mocked<AnthropicLogger>;

    gateway = new AnthropicLlmGateway(configService, anthropicLogger);
    createMock = anthropicConstructorMock.mock.results[0].value.messages
      .create as jest.Mock;
  });

  it('should create the Anthropic client with the configured api key', () => {
    expect(anthropicConstructorMock).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
    });
  });

  it('should return a tool call response when Anthropic requests a tool', async () => {
    createMock.mockResolvedValue({
      id: 'msg_123',
      model: 'claude-sonnet-4-6',
      stop_reason: 'tool_use',
      content: [
        {
          type: 'text',
          text: "I'll check the order status.",
        },
        {
          type: 'tool_use',
          id: 'toolu_123',
          name: 'getOrderStatus',
          input: {
            orderId: '123',
          },
        },
      ],
    });

    const result = await gateway.generate({
      messages: [
        {
          role: 'system',
          content: 'System prompt',
        },
        {
          role: 'user',
          content: 'What is the status of order 123?',
        },
      ],
      tools: [
        {
          name: 'getOrderStatus',
          description: 'Returns the status of an order by its ID.',
          parameters: {
            type: 'object',
            properties: {
              orderId: { type: 'string' },
            },
            required: ['orderId'],
          },
        },
      ],
    });

    expect(createMock).toHaveBeenCalledWith({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'System prompt',
      messages: [
        {
          role: 'user',
          content: 'What is the status of order 123?',
        },
      ],
      tools: [
        {
          name: 'getOrderStatus',
          description: 'Returns the status of an order by its ID.',
          input_schema: {
            type: 'object',
            properties: {
              orderId: { type: 'string' },
            },
            required: ['orderId'],
          },
        },
      ],
    });

    expect(result).toEqual({
      type: 'tool_call',
      content: "I'll check the order status.",
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
      arguments: {
        orderId: '123',
      },
    });
  });

  it('should return a final answer when Anthropic returns text only', async () => {
    createMock.mockResolvedValue({
      id: 'msg_456',
      model: 'claude-sonnet-4-6',
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: 'Order 123 has been paid.',
        },
      ],
    });

    const result = await gateway.generate({
      messages: [
        {
          role: 'user',
          content: 'What is the status of order 123?',
        },
      ],
    });

    expect(result).toEqual({
      type: 'final_answer',
      content: 'Order 123 has been paid.',
    });
  });

  it('should map assistant tool-use and tool-result messages in the follow-up request', async () => {
    createMock.mockResolvedValue({
      id: 'msg_789',
      model: 'claude-sonnet-4-6',
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: 'Order 123 has been paid.',
        },
      ],
    });

    await gateway.generate({
      messages: [
        {
          role: 'system',
          content: 'System prompt',
        },
        {
          role: 'user',
          content: 'What is the status of order 123?',
        },
        {
          role: 'assistant',
          content: "I'll check the order status.",
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_123',
          toolArguments: {
            orderId: '123',
          },
        },
        {
          role: 'tool',
          content: '{"orderId":"123","status":"PAID"}',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_123',
        },
      ],
      tools: [
        {
          name: 'getOrderStatus',
          description: 'Returns the status of an order by its ID.',
          parameters: {
            type: 'object',
            properties: {
              orderId: { type: 'string' },
            },
            required: ['orderId'],
          },
        },
      ],
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'user',
            content: 'What is the status of order 123?',
          },
          {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: "I'll check the order status.",
              },
              {
                type: 'tool_use',
                id: 'toolu_123',
                name: 'getOrderStatus',
                input: {
                  orderId: '123',
                },
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'toolu_123',
                content: '{"orderId":"123","status":"PAID"}',
              },
            ],
          },
        ],
      }),
    );
  });

  it('should fallback to haiku when ANTHROPIC_MODEL is empty', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'ANTHROPIC_MODEL') {
        return '';
      }

      if (key === 'NODE_ENV') {
        return 'test';
      }

      return undefined;
    });

    gateway = new AnthropicLlmGateway(configService, anthropicLogger);
    createMock = anthropicConstructorMock.mock.results.at(-1)?.value.messages
      .create as jest.Mock;

    createMock.mockResolvedValue({
      id: 'msg_999',
      model: 'claude-haiku-4-5',
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: 'Fallback model answer.',
        },
      ],
    });

    await gateway.generate({
      messages: [
        {
          role: 'user',
          content: 'hello',
        },
      ],
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5',
      }),
    );
  });

  it('should throw when ANTHROPIC_MODEL is unsupported', () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'ANTHROPIC_MODEL') {
        return 'unsupported-model';
      }

      if (key === 'NODE_ENV') {
        return 'test';
      }

      return undefined;
    });

    expect(
      () => new AnthropicLlmGateway(configService, anthropicLogger),
    ).toThrow('Unsupported Anthropic model: unsupported-model');
  });

  // Helpers in anthropic.logger.ts and utils.mapper.ts are intentionally
  // not unit-tested here. This spec focuses only on gateway behavior and contract.
});
