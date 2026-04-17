import { Injectable } from '@nestjs/common';

import { LlmMessage } from '../llm/types/llm.types';

@Injectable()
export class ConversationHistoryTruncator {
  truncate(messages: LlmMessage[]): LlmMessage[] {
    return messages;
  }
}
