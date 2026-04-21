import { ORDER_FULL_SYSTEM_PROMPT } from '../../ask/prompts/system.prompt';
import { LlmMessage } from '../../llm/types/llm.types';
import { MessageService } from '../../message/message.service';
import { MessageRole } from '../../message/message-role.enum';
import { ConversationHistoryBuilder } from './conversation-history.builder';
import { ConversationHistoryTruncator } from './conversation-history.truncator';
import { ConversationMessageMapper } from './conversation-message.mapper';

describe('ConversationHistoryBuilder', () => {
  let service: ConversationHistoryBuilder;
  let messageService: jest.Mocked<MessageService>;
  let truncator: jest.Mocked<ConversationHistoryTruncator>;

  beforeEach(() => {
    messageService = {
      listByConversationId: jest.fn(),
    } as unknown as jest.Mocked<MessageService>;

    truncator = {
      truncate: jest.fn((messages: LlmMessage[]) => messages),
    } as unknown as jest.Mocked<ConversationHistoryTruncator>;

    service = new ConversationHistoryBuilder(
      messageService,
      new ConversationMessageMapper(),
      truncator,
    );
  });

  it('should prepend the stored system prompt and map persisted messages', async () => {
    messageService.listByConversationId.mockResolvedValue([
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        role: MessageRole.USER,
        content: 'What is the status of order 123?',
      },
      {
        id: 'message-2',
        conversationId: 'conversation-1',
        role: MessageRole.ASSISTANT,
        content: "I'll check it.",
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_123',
      },
      {
        id: 'message-3',
        conversationId: 'conversation-1',
        role: MessageRole.TOOL,
        content: '{"orderId":"123","status":"PAID"}',
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_123',
      },
    ] as never[]);

    const result = await service.build({
      id: 'conversation-1',
      systemPrompt: 'stored system prompt',
    });

    expect(truncator.truncate).toHaveBeenCalledWith([
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
        content: '{"orderId":"123","status":"PAID"}',
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_123',
      },
    ]);
    expect(result).toEqual([
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
        content: '{"orderId":"123","status":"PAID"}',
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_123',
      },
    ]);
  });

  it('should fall back to the current system prompt when the conversation has no stored prompt', async () => {
    messageService.listByConversationId.mockResolvedValue([] as never[]);

    const result = await service.build({
      id: 'conversation-1',
      systemPrompt: '',
    });

    expect(result).toEqual([
      {
        role: 'system',
        content: ORDER_FULL_SYSTEM_PROMPT,
      },
    ]);
  });

  it('should prefer the selected system prompt over the stored conversation prompt', async () => {
    messageService.listByConversationId.mockResolvedValue([] as never[]);

    const result = await service.build(
      {
        id: 'conversation-1',
        systemPrompt: 'stored system prompt',
      },
      'selected system prompt',
    );

    expect(result).toEqual([
      {
        role: 'system',
        content: 'selected system prompt',
      },
    ]);
  });
});
