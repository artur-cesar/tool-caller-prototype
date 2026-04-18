import { AskLogger } from '../ask/ask.logger';
import type { LlmGateway } from '../llm/types/llm.gateway';
import { MessageService } from '../message/message.service';
import { ToolExecutorService } from '../tools/tool-executor.service';
import { ConversationHistoryBuilder } from './history/conversation-history.builder';
import { TurnRunnerService } from './turn-runner.service';

describe('TurnRunnerService', () => {
  let service: TurnRunnerService;
  let llmGateway: jest.Mocked<LlmGateway>;
  let historyBuilder: jest.Mocked<ConversationHistoryBuilder>;
  let messageService: jest.Mocked<MessageService>;
  let toolExecutorService: jest.Mocked<ToolExecutorService>;
  let askLogger: jest.Mocked<AskLogger>;

  const conversation = {
    id: 'conversation-1',
    userId: 'user-1',
    systemPrompt: 'stored system prompt',
  } as never;

  beforeEach(() => {
    llmGateway = {
      generate: jest.fn(),
    };

    historyBuilder = {
      build: jest.fn(),
    } as unknown as jest.Mocked<ConversationHistoryBuilder>;

    messageService = {
      createAssistantMessage: jest.fn(),
      createAssistantToolCallMessage: jest.fn(),
      createToolMessage: jest.fn(),
    } as unknown as jest.Mocked<MessageService>;

    toolExecutorService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ToolExecutorService>;

    askLogger = {
      llmRequest: jest.fn(),
      llmResponse: jest.fn(),
      toolExecution: jest.fn(),
      toolResult: jest.fn(),
    } as unknown as jest.Mocked<AskLogger>;

    service = new TurnRunnerService(
      llmGateway,
      historyBuilder,
      messageService,
      toolExecutorService,
      askLogger,
    );
  });

  it('should persist the final assistant answer when the llm answers directly', async () => {
    historyBuilder.build.mockResolvedValue([
      {
        role: 'system',
        content: 'stored system prompt',
      },
      {
        role: 'user',
        content: 'hello',
      },
    ]);
    llmGateway.generate.mockResolvedValue({
      type: 'final_answer',
      content: 'Direct answer',
    });

    const result = await service.run(conversation);

    expect(llmGateway.generate).toHaveBeenCalledTimes(1);
    expect(messageService.createAssistantMessage).toHaveBeenCalledWith(
      'conversation-1',
      'Direct answer',
    );
    expect(result).toEqual({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'Direct answer',
    });
  });

  it('should preserve history and complete the tool flow', async () => {
    historyBuilder.build
      .mockResolvedValueOnce([
        {
          role: 'system',
          content: 'stored system prompt',
        },
        {
          role: 'user',
          content: 'What is the status of order 111?',
        },
        {
          role: 'assistant',
          content: 'Order 111 status: SHIPPED.',
        },
        {
          role: 'user',
          content: 'What is the status of order 123?',
        },
      ])
      .mockResolvedValueOnce([
        {
          role: 'system',
          content: 'stored system prompt',
        },
        {
          role: 'user',
          content: 'What is the status of order 111?',
        },
        {
          role: 'assistant',
          content: 'Order 111 status: SHIPPED.',
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
      ]);
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
    toolExecutorService.execute.mockReturnValue({
      supported: true,
      result: {
        orderId: '123',
        status: 'PAID',
      },
    });

    const result = await service.run(conversation);

    expect(toolExecutorService.execute).toHaveBeenCalledWith('getOrderStatus', {
      orderId: '123',
    });
    expect(messageService.createAssistantToolCallMessage).toHaveBeenCalledWith(
      'conversation-1',
      "I'll check it.",
      'getOrderStatus',
      'toolu_123',
    );
    expect(messageService.createToolMessage).toHaveBeenCalledWith(
      'conversation-1',
      'getOrderStatus',
      'toolu_123',
      JSON.stringify({
        orderId: '123',
        status: 'PAID',
      }),
    );
    expect(messageService.createAssistantMessage).toHaveBeenLastCalledWith(
      'conversation-1',
      'Order 123 has been paid.',
    );
    expect(llmGateway.generate).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'Order 123 has been paid.',
    });
  });

  it('should return a fallback final answer when the tool is not supported', async () => {
    historyBuilder.build.mockResolvedValue([
      {
        role: 'system',
        content: 'stored system prompt',
      },
      {
        role: 'user',
        content: 'What is the status of order 123?',
      },
    ]);
    llmGateway.generate.mockResolvedValue({
      type: 'tool_call',
      content: 'Trying unsupported tool.',
      toolName: 'unknownTool',
      arguments: {
        orderId: '123',
      },
    });
    toolExecutorService.execute.mockReturnValue({
      supported: false,
    });

    const result = await service.run(conversation);

    expect(llmGateway.generate).toHaveBeenCalledTimes(1);
    expect(messageService.createAssistantToolCallMessage).toHaveBeenCalledWith(
      'conversation-1',
      'Trying unsupported tool.',
      'unknownTool',
      null,
    );
    expect(messageService.createAssistantMessage).toHaveBeenCalledWith(
      'conversation-1',
      'Tool unknownTool is not supported.',
    );
    expect(result).toEqual({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'Tool unknownTool is not supported.',
    });
  });

  it('should complete the tool flow for getOrderItems', async () => {
    historyBuilder.build
      .mockResolvedValueOnce([
        {
          role: 'system',
          content: 'stored system prompt',
        },
        {
          role: 'user',
          content: 'What items are in order 123?',
        },
      ])
      .mockResolvedValueOnce([
        {
          role: 'system',
          content: 'stored system prompt',
        },
        {
          role: 'user',
          content: 'What items are in order 123?',
        },
        {
          role: 'assistant',
          content: "I'll check it.",
          toolName: 'getOrderItems',
          toolUseId: 'toolu_456',
        },
        {
          role: 'tool',
          toolName: 'getOrderItems',
          toolUseId: 'toolu_456',
          content: JSON.stringify({
            orderId: '123',
            found: true,
            items: ['Keyboard', 'Mouse'],
          }),
        },
      ]);
    llmGateway.generate
      .mockResolvedValueOnce({
        type: 'tool_call',
        content: "I'll check it.",
        toolName: 'getOrderItems',
        toolUseId: 'toolu_456',
        arguments: {
          orderId: '123',
        },
      })
      .mockResolvedValueOnce({
        type: 'final_answer',
        content: 'Order 123 contains Keyboard and Mouse.',
      });
    toolExecutorService.execute.mockReturnValue({
      supported: true,
      result: {
        orderId: '123',
        found: true,
        items: ['Keyboard', 'Mouse'],
      },
    });

    const result = await service.run(conversation);

    expect(toolExecutorService.execute).toHaveBeenCalledWith('getOrderItems', {
      orderId: '123',
    });
    expect(messageService.createToolMessage).toHaveBeenCalledWith(
      'conversation-1',
      'getOrderItems',
      'toolu_456',
      JSON.stringify({
        orderId: '123',
        found: true,
        items: ['Keyboard', 'Mouse'],
      }),
    );
    expect(result).toEqual({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'Order 123 contains Keyboard and Mouse.',
    });
  });

  it('should persist a fallback answer when the follow-up llm call does not finish', async () => {
    historyBuilder.build
      .mockResolvedValueOnce([
        {
          role: 'system',
          content: 'stored system prompt',
        },
        {
          role: 'user',
          content: 'What is the status of order 123?',
        },
      ])
      .mockResolvedValueOnce([
        {
          role: 'system',
          content: 'stored system prompt',
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
        },
        {
          role: 'tool',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_123',
          content: '{"orderId":"123","status":"PAID"}',
        },
      ]);
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
        type: 'tool_call',
        content: 'Still thinking.',
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_999',
        arguments: {
          orderId: '123',
        },
      });
    toolExecutorService.execute.mockReturnValue({
      supported: true,
      result: {
        orderId: '123',
        status: 'PAID',
      },
    });

    const result = await service.run(conversation);

    expect(messageService.createAssistantMessage).toHaveBeenLastCalledWith(
      'conversation-1',
      'I could not generate a final answer.',
    );
    expect(result).toEqual({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'I could not generate a final answer.',
    });
  });
});
