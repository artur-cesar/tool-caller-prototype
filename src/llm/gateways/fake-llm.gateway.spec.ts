import { ConfigService } from '@nestjs/config';

import { FakeLlmGateway } from './fake-llm.gateway';

describe('FakeLlmGateway', () => {
  let gateway: FakeLlmGateway;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('test'),
    } as unknown as jest.Mocked<ConfigService>;

    gateway = new FakeLlmGateway(configService);
  });

  it('should return a tool call when the user asks for an order status with a valid id', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'user',
          content: 'I want to know the status of my order 123',
        },
      ],
    });

    expect(result).toEqual({
      type: 'tool_call',
      content: "I'll check the order status for you.",
      toolName: 'getOrderStatus',
      toolUseId: 'fake-tool-use-id',
      arguments: {
        orderId: '123',
      },
    });
  });

  it('should support order detection in portuguese', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'user',
          content: 'Qual o status do pedido 456?',
        },
      ],
    });

    expect(result).toEqual({
      type: 'tool_call',
      content: "I'll check the order status for you.",
      toolName: 'getOrderStatus',
      toolUseId: 'fake-tool-use-id',
      arguments: {
        orderId: '456',
      },
    });
  });

  it('should return a final answer when no valid order lookup is identified', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'user',
          content: 'Can you help me with something else?',
        },
      ],
    });

    expect(result).toEqual({
      type: 'final_answer',
      content:
        'I could not identify a valid order lookup. Try something like: "What is the status of order 123?"',
    });
  });

  it('should return a final answer from the tool result when a tool message is present', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'user',
          content: 'What is the status of order 789?',
        },
        {
          role: 'tool',
          toolName: 'getOrderStatus',
          toolUseId: 'fake-tool-use-id',
          content: '{"orderId":"789","status":"DELIVERED"}',
        },
      ],
    });

    expect(result).toEqual({
      type: 'final_answer',
      content: 'Order 789 status: DELIVERED.',
    });
  });
});
