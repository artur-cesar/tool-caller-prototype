import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { ConversationService } from '../conversation/conversation.service';
import { ConversationAccessService } from './conversation-access.service';

describe('ConversationAccessService', () => {
  let service: ConversationAccessService;
  let conversationService: jest.Mocked<ConversationService>;

  beforeEach(() => {
    conversationService = {
      create: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<ConversationService>;

    service = new ConversationAccessService(conversationService);
  });

  it('should create a new conversation when no conversationId is provided', async () => {
    conversationService.create.mockResolvedValue({
      id: 'conversation-1',
      userId: 'user-1',
      systemPrompt: 'stored system prompt',
    } as never);

    const result = await service.findOrCreate('user-1');

    expect(conversationService.create).toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining(
        'You are an assistant for order support experiments.',
      ),
    );
    expect(result).toEqual({
      id: 'conversation-1',
      userId: 'user-1',
      systemPrompt: 'stored system prompt',
    });
  });

  it('should reject when the conversation does not exist', async () => {
    conversationService.findById.mockResolvedValue(null);

    await expect(
      service.findOrCreate('user-1', 'conversation-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should reject when the conversation belongs to another user', async () => {
    conversationService.findById.mockResolvedValue({
      id: 'conversation-1',
      userId: 'user-2',
      systemPrompt: 'stored system prompt',
    } as never);

    await expect(
      service.findOrCreate('user-1', 'conversation-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
