import { OrderRepository } from 'src/order/order.repository';

import type { LlmGateway } from '../llm/types/llm.gateway';
import { AskLogger } from './ask.logger';
import { AskService } from './ask.service';

describe('AskService', () => {
  let service: AskService;
  let llmGateway: jest.Mocked<LlmGateway>;
  let orderRepository: jest.Mocked<OrderRepository>;
  let askLogger: jest.Mocked<AskLogger>;

  beforeEach(() => {
    llmGateway = {
      generate: jest.fn(),
    };

    orderRepository = {
      getOrderStatus: jest.fn(),
    } as unknown as jest.Mocked<OrderRepository>;

    askLogger = {
      llmRequest: jest.fn(),
      llmResponse: jest.fn(),
      toolExecution: jest.fn(),
      toolResult: jest.fn(),
    } as unknown as jest.Mocked<AskLogger>;

    service = new AskService(llmGateway, orderRepository, askLogger);
  });

  it('should return the final answer when the llm answers directly', async () => {
    llmGateway.generate.mockResolvedValue({
      type: 'final_answer',
      content: 'Direct answer',
    });

    const result = await service.handle('hello');

    expect(llmGateway.generate).toHaveBeenCalledTimes(1);
    expect(orderRepository.getOrderStatus).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: 'final_answer',
      content: 'Direct answer',
    });
  });

  it('should execute getOrderStatus and request a final answer from the llm', async () => {
    llmGateway.generate
      .mockResolvedValueOnce({
        type: 'tool_call',
        content: "I'll check it.",
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_123',
        arguments: {
          orderId: '123',
        },
      })
      .mockResolvedValueOnce({
        type: 'final_answer',
        content: 'Order 123 has been paid.',
      });

    orderRepository.getOrderStatus.mockReturnValue({
      orderId: '123',
      status: 'PAID',
    });

    const result = await service.handle('What is the status of order 123?');

    expect(orderRepository.getOrderStatus).toHaveBeenCalledWith('123');
    expect(llmGateway.generate).toHaveBeenCalledTimes(2);
    expect(llmGateway.generate).toHaveBeenNthCalledWith(2, {
      messages: [
        {
          role: 'system',
          content:
            'You are a study assistant for experiments with LLM providers.',
        },
        {
          role: 'user',
          content: 'What is the status of order 123?',
        },
        {
          role: 'assistant',
          content: "I'll check it.",
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_123',
          toolArguments: {
            orderId: '123',
          },
        },
        {
          role: 'tool',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_123',
          content: JSON.stringify({
            orderId: '123',
            status: 'PAID',
          }),
        },
      ],
      tools: expect.any(Array),
    });
    expect(result).toEqual({
      type: 'final_answer',
      content: 'Order 123 has been paid.',
    });
  });

  it('should return a fallback final answer when the tool is not supported', async () => {
    llmGateway.generate.mockResolvedValue({
      type: 'tool_call',
      toolName: 'unknownTool',
      arguments: {
        orderId: '123',
      },
    });

    const result = await service.handle('What is the status of order 123?');

    expect(orderRepository.getOrderStatus).not.toHaveBeenCalled();
    expect(llmGateway.generate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      type: 'final_answer',
      content: 'Tool unknownTool is not supported.',
    });
  });
});
