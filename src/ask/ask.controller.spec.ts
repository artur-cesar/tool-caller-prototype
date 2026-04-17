import { Test, TestingModule } from '@nestjs/testing';

import { AskController } from './ask.controller';
import { AskService } from './ask.service';

describe('AskController', () => {
  let controller: AskController;
  const askService = {
    handle: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AskController],
      providers: [
        {
          provide: AskService,
          useValue: askService,
        },
      ],
    }).compile();

    controller = module.get<AskController>(AskController);
  });

  it('should delegate the message to AskService.handle', async () => {
    askService.handle.mockResolvedValue({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'Order 123 has been paid.',
    });

    const result = await controller.handle(
      {
        message: 'What is the status of order 123?',
        conversationId: 'conversation-1',
      },
      'user-1',
    );

    expect(askService.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        message: 'What is the status of order 123?',
        conversationId: 'conversation-1',
      }),
    );
    expect(result).toEqual({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'Order 123 has been paid.',
    });
  });
});
