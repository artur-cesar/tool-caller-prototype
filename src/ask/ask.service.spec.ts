import { MessageService } from '../message/message.service';
import { ConversationAccessService } from '../turn/conversation-access.service';
import { TurnRunnerService } from '../turn/turn-runner.service';
import { AskService } from './ask.service';

describe('AskService', () => {
  let service: AskService;
  let conversationAccessService: jest.Mocked<ConversationAccessService>;
  let messageService: jest.Mocked<MessageService>;
  let turnRunnerService: jest.Mocked<TurnRunnerService>;

  beforeEach(() => {
    conversationAccessService = {
      findOrCreate: jest.fn(),
    } as unknown as jest.Mocked<ConversationAccessService>;

    messageService = {
      createUserMessage: jest.fn(),
    } as unknown as jest.Mocked<MessageService>;

    turnRunnerService = {
      run: jest.fn(),
    } as unknown as jest.Mocked<TurnRunnerService>;

    service = new AskService(
      conversationAccessService,
      messageService,
      turnRunnerService,
    );
  });

  it('should resolve the conversation, persist the user message and delegate turn execution', async () => {
    conversationAccessService.findOrCreate.mockResolvedValue({
      id: 'conversation-1',
      userId: 'user-1',
      systemPrompt: 'stored system prompt',
    } as never);
    turnRunnerService.run.mockResolvedValue({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'Direct answer',
    });

    const result = await service.handle({
      userId: 'user-1',
      message: 'hello',
    });

    expect(conversationAccessService.findOrCreate).toHaveBeenCalledWith(
      'user-1',
      undefined,
    );
    expect(messageService.createUserMessage).toHaveBeenCalledWith(
      'conversation-1',
      'hello',
    );
    expect(turnRunnerService.run).toHaveBeenCalledWith({
      id: 'conversation-1',
      userId: 'user-1',
      systemPrompt: 'stored system prompt',
    });
    expect(result).toEqual({
      conversationId: 'conversation-1',
      type: 'final_answer',
      content: 'Direct answer',
    });
  });
});
