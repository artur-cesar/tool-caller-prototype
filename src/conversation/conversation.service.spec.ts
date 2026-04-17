import { Repository } from 'typeorm';

import { Conversation } from './conversation.entity';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;
  let repository: jest.Mocked<Repository<Conversation>>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Conversation>>;

    service = new ConversationService(repository);
  });

  it('should create a conversation for a user', async () => {
    const conversation = {
      id: 'conversation-1',
      userId: 'user-1',
      systemPrompt: 'system prompt',
    } as Conversation;

    repository.create.mockReturnValue(conversation);
    repository.save.mockResolvedValue(conversation);

    const result = await service.create('user-1', 'system prompt');

    expect(repository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      systemPrompt: 'system prompt',
    });
    expect(repository.save).toHaveBeenCalledWith(conversation);
    expect(result).toBe(conversation);
  });

  it('should find a conversation by id', async () => {
    const conversation = { id: 'conversation-1' } as Conversation;
    repository.findOne.mockResolvedValue(conversation);

    const result = await service.findById('conversation-1');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
    });
    expect(result).toBe(conversation);
  });

  it('should find a conversation by id and user id', async () => {
    const conversation = {
      id: 'conversation-1',
      userId: 'user-1',
    } as Conversation;
    repository.findOne.mockResolvedValue(conversation);

    const result = await service.findByIdAndUserId('conversation-1', 'user-1');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'conversation-1', userId: 'user-1' },
    });
    expect(result).toBe(conversation);
  });
});
