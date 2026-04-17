import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderRepository } from 'src/order/order.repository';

import { ConversationService } from '../conversation/conversation.service';
import type { LlmGateway } from '../llm/types/llm.gateway';
import { MessageService } from '../message/message.service';
import { MessageRole } from '../message/message-role.enum';
import { AskLogger } from './ask.logger';
import { AskService } from './ask.service';

describe('AskService', () => {
  let service: AskService;
  let llmGateway: jest.Mocked<LlmGateway>;
  let conversationService: jest.Mocked<ConversationService>;
  let messageService: jest.Mocked<MessageService>;
  let orderRepository: jest.Mocked<OrderRepository>;
  let askLogger: jest.Mocked<AskLogger>;

  beforeEach(() => {
    llmGateway = {
      generate: jest.fn(),
    };

    conversationService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUserId: jest.fn(),
    } as unknown as jest.Mocked<ConversationService>;

    messageService = {
      createUserMessage: jest.fn(),
      createAssistantMessage: jest.fn(),
      createAssistantToolCallMessage: jest.fn(),
      createToolMessage: jest.fn(),
      listByConversationId: jest.fn(),
    } as unknown as jest.Mocked<MessageService>;

    orderRepository = {
      getOrderStatus: jest.fn(),
    } as unknown as jest.Mocked<OrderRepository>;

    askLogger = {
      llmRequest: jest.fn(),
      llmResponse: jest.fn(),
      toolExecution: jest.fn(),
      toolResult: jest.fn(),
    } as unknown as jest.Mocked<AskLogger>;

    service = new AskService(
      llmGateway,
      conversationService,
      messageService,
      orderRepository,
      askLogger,
    );
  });

  it('should create a conversation, persist the user message and return the final answer', async () => {
    conversationService.create.mockResolvedValue({
      id: 'conversation-1',
      userId: 'user-1',
      systemPrompt: 'stored system prompt',
    });
    messageService.listByConversationId.mockResolvedValue([
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        role: MessageRole.USER,
        content: 'hello',
      },
    ] as never[]);
    llmGateway.generate.mockResolvedValue({
      type: 'final_answer',
      content: 'Direct answer',
    });

    const result = await service.handle({
      userId: 'user-1',
      message: 'hello',
    });

    expect(conversationService.create).toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining(
        'You are an assistant for order support experiments.',
      ),
    );
    expect(messageService.createUserMessage).toHaveBeenCalledWith(
      'conversation-1',
      'hello',
    );
    expect(llmGateway.generate).toHaveBeenCalledTimes(1);
    expect(llmGateway.generate).toHaveBeenCalledWith({
      messages: [
        {
          role: 'system',
          content: 'stored system prompt',
        },
        {
          role: 'user',
          content: 'hello',
        },
      ],
      tools: expect.any(Array),
    });
    expect(messageService.createAssistantMessage).toHaveBeenCalledWith(
      'conversation-1',
      'Direct answer',
    );
    expect(orderRepository.getOrderStatus).not.toHaveBeenCalled();
    expect(result).toEqual({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'Direct answer',
    });
  });

  it('should load an existing conversation, preserve history and complete the tool flow', async () => {
    conversationService.findById.mockResolvedValue({
      id: 'conversation-1',
      userId: 'user-1',
      systemPrompt: 'stored system prompt',
    });
    messageService.listByConversationId
      .mockResolvedValueOnce([
        {
          id: 'message-1',
          conversationId: 'conversation-1',
          role: MessageRole.USER,
          content: 'What is the status of order 111?',
        },
        {
          id: 'message-2',
          conversationId: 'conversation-1',
          role: MessageRole.ASSISTANT,
          content: 'Order 111 status: SHIPPED.',
        },
        {
          id: 'message-3',
          conversationId: 'conversation-1',
          role: MessageRole.USER,
          content: 'What is the status of order 123?',
        },
      ] as never[])
      .mockResolvedValueOnce([
        {
          id: 'message-1',
          conversationId: 'conversation-1',
          role: MessageRole.USER,
          content: 'What is the status of order 111?',
        },
        {
          id: 'message-2',
          conversationId: 'conversation-1',
          role: MessageRole.ASSISTANT,
          content: 'Order 111 status: SHIPPED.',
        },
        {
          id: 'message-3',
          conversationId: 'conversation-1',
          role: MessageRole.USER,
          content: 'What is the status of order 123?',
        },
        {
          id: 'message-4',
          conversationId: 'conversation-1',
          role: MessageRole.ASSISTANT,
          content: "I'll check it.",
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_123',
        },
        {
          id: 'message-5',
          conversationId: 'conversation-1',
          role: MessageRole.TOOL,
          content: JSON.stringify({
            orderId: '123',
            status: 'PAID',
          }),
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_123',
        },
      ] as never[]);
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

    const result = await service.handle({
      userId: 'user-1',
      message: 'What is the status of order 123?',
      conversationId: 'conversation-1',
    });

    expect(orderRepository.getOrderStatus).toHaveBeenCalledWith('123');
    expect(messageService.createUserMessage).toHaveBeenCalledWith(
      'conversation-1',
      'What is the status of order 123?',
    );
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
    expect(llmGateway.generate).toHaveBeenNthCalledWith(1, {
      messages: [
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
      ],
      tools: expect.any(Array),
    });
    expect(llmGateway.generate).toHaveBeenNthCalledWith(2, {
      messages: [
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
      ],
      tools: expect.any(Array),
    });
    expect(result).toEqual({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'Order 123 has been paid.',
    });
  });

  it('should return a fallback final answer when the tool is not supported', async () => {
    conversationService.create.mockResolvedValue({
      id: 'conversation-1',
      userId: 'user-1',
      systemPrompt: 'stored system prompt',
    });
    messageService.listByConversationId.mockResolvedValue([
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        role: MessageRole.USER,
        content: 'What is the status of order 123?',
      },
    ] as never[]);
    llmGateway.generate.mockResolvedValue({
      type: 'tool_call',
      content: 'Trying unsupported tool.',
      toolName: 'unknownTool',
      arguments: {
        orderId: '123',
      },
    });

    const result = await service.handle({
      userId: 'user-1',
      message: 'What is the status of order 123?',
    });

    expect(orderRepository.getOrderStatus).not.toHaveBeenCalled();
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

  it('should reject when the conversation does not exist', async () => {
    conversationService.findById.mockResolvedValue(null);

    await expect(
      service.handle({
        userId: 'user-1',
        message: 'hello',
        conversationId: 'conversation-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should reject when the conversation belongs to another user', async () => {
    conversationService.findById.mockResolvedValue({
      id: 'conversation-1',
      userId: 'user-2',
      systemPrompt: 'stored system prompt',
    });

    await expect(
      service.handle({
        userId: 'user-1',
        message: 'hello',
        conversationId: 'conversation-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should fall back to the current prompt when an old conversation has no stored prompt', async () => {
    conversationService.findById.mockResolvedValue({
      id: 'conversation-1',
      userId: 'user-1',
      systemPrompt: '',
    });
    messageService.listByConversationId.mockResolvedValue([
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        role: MessageRole.USER,
        content: 'hello',
      },
    ] as never[]);
    llmGateway.generate.mockResolvedValue({
      type: 'final_answer',
      content: 'Direct answer',
    });

    await service.handle({
      userId: 'user-1',
      message: 'hello',
      conversationId: 'conversation-1',
    });

    expect(llmGateway.generate).toHaveBeenCalledWith({
      messages: [
        {
          role: 'system',
          content: expect.stringContaining(
            'You are an assistant for order support experiments.',
          ),
        },
        {
          role: 'user',
          content: 'hello',
        },
      ],
      tools: expect.any(Array),
    });
  });
});
