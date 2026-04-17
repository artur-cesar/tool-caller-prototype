import { Repository } from 'typeorm';

import { Message } from './message.entity';
import { MessageService } from './message.service';
import { MessageRole } from './message-role.enum';

describe('MessageService', () => {
  let service: MessageService;
  let repository: jest.Mocked<Repository<Message>>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<Message>>;

    service = new MessageService(repository);
  });

  it('should create a user message', async () => {
    const message = {
      id: 'message-1',
      conversationId: 'conversation-1',
      role: MessageRole.USER,
      content: 'hello',
      toolName: null,
      toolUseId: null,
    } as Message;

    repository.create.mockReturnValue(message);
    repository.save.mockResolvedValue(message);

    const result = await service.createUserMessage('conversation-1', 'hello');

    expect(repository.create).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      role: MessageRole.USER,
      content: 'hello',
      toolName: null,
      toolUseId: null,
    });
    expect(repository.save).toHaveBeenCalledWith(message);
    expect(result).toBe(message);
  });

  it('should create an assistant message', async () => {
    const message = {
      id: 'message-1',
      conversationId: 'conversation-1',
      role: MessageRole.ASSISTANT,
      content: 'answer',
      toolName: null,
      toolUseId: null,
    } as Message;

    repository.create.mockReturnValue(message);
    repository.save.mockResolvedValue(message);

    const result = await service.createAssistantMessage(
      'conversation-1',
      'answer',
    );

    expect(repository.create).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      role: MessageRole.ASSISTANT,
      content: 'answer',
      toolName: null,
      toolUseId: null,
    });
    expect(repository.save).toHaveBeenCalledWith(message);
    expect(result).toBe(message);
  });

  it('should create an assistant tool call message', async () => {
    const message = {
      id: 'message-1',
      conversationId: 'conversation-1',
      role: MessageRole.ASSISTANT,
      content: "I'll check it.",
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
    } as Message;

    repository.create.mockReturnValue(message);
    repository.save.mockResolvedValue(message);

    const result = await service.createAssistantToolCallMessage(
      'conversation-1',
      "I'll check it.",
      'getOrderStatus',
      'toolu_123',
    );

    expect(repository.create).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      role: MessageRole.ASSISTANT,
      content: "I'll check it.",
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
    });
    expect(repository.save).toHaveBeenCalledWith(message);
    expect(result).toBe(message);
  });

  it('should create a tool message', async () => {
    const message = {
      id: 'message-1',
      conversationId: 'conversation-1',
      role: MessageRole.TOOL,
      content: '{"status":"PAID"}',
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
    } as Message;

    repository.create.mockReturnValue(message);
    repository.save.mockResolvedValue(message);

    const result = await service.createToolMessage(
      'conversation-1',
      'getOrderStatus',
      'toolu_123',
      '{"status":"PAID"}',
    );

    expect(repository.create).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      role: MessageRole.TOOL,
      content: '{"status":"PAID"}',
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
    });
    expect(repository.save).toHaveBeenCalledWith(message);
    expect(result).toBe(message);
  });

  it('should list messages by conversation id ordered by creation time', async () => {
    const messages = [{ id: 'message-1' }, { id: 'message-2' }] as Message[];
    repository.find.mockResolvedValue(messages);

    const result = await service.listByConversationId('conversation-1');

    expect(repository.find).toHaveBeenCalledWith({
      where: { conversationId: 'conversation-1' },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    expect(result).toBe(messages);
  });
});
