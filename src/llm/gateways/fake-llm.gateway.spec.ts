import { ConfigService } from '@nestjs/config';

import {
  ORDER_FULL_SYSTEM_PROMPT,
  ORDER_STATUS_ONLY_SYSTEM_PROMPT,
} from '../../ask/prompts/system.prompt';
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

  it('should return a tool call when the user asks for order items with a valid id', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'user',
          content: 'I want to know the items of my order 123',
        },
      ],
    });

    expect(result).toEqual({
      type: 'tool_call',
      content: "I'll check the order items for you.",
      toolName: 'getOrderItems',
      toolUseId: 'fake-tool-use-id',
      arguments: {
        orderId: '123',
      },
    });
  });

  it('should default to full mode behavior when the system prompt is omitted', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'user',
          content: 'I want to know the items of my order 123',
        },
      ],
    });

    expect(result).toEqual({
      type: 'tool_call',
      content: "I'll check the order items for you.",
      toolName: 'getOrderItems',
      toolUseId: 'fake-tool-use-id',
      arguments: {
        orderId: '123',
      },
    });
  });

  it('should refuse item questions in status-only mode without calling getOrderItems', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'system',
          content: ORDER_STATUS_ONLY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: 'I want to know the items of my order 123',
        },
      ],
    });

    expect(result).toEqual({
      type: 'final_answer',
      content:
        'I can only help with order status in this mode. I do not have the necessary capability to answer order item requests.',
    });
  });

  it('should use getOrderStatus for status questions in status-only mode', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'system',
          content: ORDER_STATUS_ONLY_SYSTEM_PROMPT,
        },
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

  it('should use getOrderItems for item questions in full mode', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'system',
          content: ORDER_FULL_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: 'I want to know the items of my order 123',
        },
      ],
    });

    expect(result).toEqual({
      type: 'tool_call',
      content: "I'll check the order items for you.",
      toolName: 'getOrderItems',
      toolUseId: 'fake-tool-use-id',
      arguments: {
        orderId: '123',
      },
    });
  });

  it('should keep composite order requests unsupported', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'system',
          content: ORDER_FULL_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: 'What is the status and items of order 123?',
        },
      ],
    });

    expect(result).toEqual({
      type: 'final_answer',
      content:
        'This prototype handles one backend tool action at a time. Please ask for either order status or order items.',
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

  it('should ask for clarification when the user requests order status without an id', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'user',
          content: 'What is the status of my order?',
        },
      ],
    });

    expect(result).toEqual({
      type: 'final_answer',
      content: 'Which order?',
    });
  });

  it('should continue a persisted multi-turn conversation after asking which order', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'system',
          content: 'system',
        },
        {
          role: 'user',
          content: 'What is the status of my order?',
        },
        {
          role: 'assistant',
          content: 'Which order?',
        },
        {
          role: 'user',
          content: 'order 123',
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

  it('should continue a persisted multi-turn items conversation after asking which order', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'system',
          content: 'system',
        },
        {
          role: 'user',
          content: 'What items are in my order?',
        },
        {
          role: 'assistant',
          content: 'Which order?',
        },
        {
          role: 'user',
          content: 'order 123',
        },
      ],
    });

    expect(result).toEqual({
      type: 'tool_call',
      content: "I'll check the order items for you.",
      toolName: 'getOrderItems',
      toolUseId: 'fake-tool-use-id',
      arguments: {
        orderId: '123',
      },
    });
  });

  it('should refuse a multi-turn item question in status-only mode when the order id is in prior context', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'system',
          content: ORDER_STATUS_ONLY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: 'What is the status of order 123?',
        },
        {
          role: 'assistant',
          content: 'Order 123 status: PAID.',
        },
        {
          role: 'user',
          content: 'What are the items of this order?',
        },
      ],
    });

    expect(result).toEqual({
      type: 'final_answer',
      content:
        'I can only help with order status in this mode. I do not have the necessary capability to answer order item requests.',
    });
  });

  it('should answer a multi-turn item question in full mode when the order id is in prior context', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'system',
          content: ORDER_FULL_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: 'What is the status of order 123?',
        },
        {
          role: 'assistant',
          content: 'Order 123 status: PAID.',
        },
        {
          role: 'user',
          content: 'What are the items of this order?',
        },
      ],
    });

    expect(result).toEqual({
      type: 'tool_call',
      content: "I'll check the order items for you.",
      toolName: 'getOrderItems',
      toolUseId: 'fake-tool-use-id',
      arguments: {
        orderId: '123',
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

  it('should return a final answer from an order items tool result', async () => {
    const result = await gateway.generate({
      messages: [
        {
          role: 'user',
          content: 'What are the items in order 123?',
        },
        {
          role: 'tool',
          toolName: 'getOrderItems',
          toolUseId: 'fake-tool-use-id',
          content:
            '{"orderId":"123","found":true,"items":["Keyboard","Mouse"]}',
        },
      ],
    });

    expect(result).toEqual({
      type: 'final_answer',
      content: 'Order 123 items: Keyboard, Mouse.',
    });
  });
});
