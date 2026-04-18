Context:
- This is a NestJS backend project used to study LLM tool calling.
- The project already supports persisted multi-turn conversations through the `/ask` endpoint using `conversationId` and `x-user-id`.
- The current architecture already includes:
  - `AskService` as the entry point
  - a dedicated turn orchestration layer under `turn/`
  - `ToolExecutorService` under `tools/`
  - `LlmGateway` abstraction with an Anthropic implementation
  - `Conversation` and `Message` persistence via PostgreSQL + TypeORM
- The system currently supports a single tool:
  - `getOrderStatus`
- The `OrderRepository` is intentionally mocked for study purposes and does not persist real orders in the database.

Goal:
- Add support for a second tool, `getOrderItems`, so the LLM can answer questions about the items contained in an order, including within persisted multi-turn conversations.

Non-goals:
- Do not introduce a real orders table
- Do not integrate order persistence into PostgreSQL
- Do not change authentication or ownership model
- Do not redesign turn orchestration
- Do not introduce dynamic tool registries or handler frameworks
- Do not implement advanced prompt engineering changes
- Do not change truncation behavior
- Do not modify the `/ask` API contract

Constraints:
- Use NestJS patterns
- Keep architecture simple and pragmatic
- Reuse the existing `ToolExecutorService`
- Reuse the existing mocked `OrderRepository`
- Preserve the current `LlmGateway` abstraction
- Avoid overengineering
- Keep tool dispatch explicit and easy to read
- Keep the study focused on LLM tool-calling behavior, not order persistence

Behavior compatibility:
- Existing `getOrderStatus` behavior must remain unchanged
- Existing multi-turn flow must remain unchanged
- Existing `/ask` request and response shape must remain unchanged
- The system must continue to support conversations where the LLM returns either:
  - a final answer directly
  - a tool call followed by a final answer
- Existing tests for `getOrderStatus` and multi-turn orchestration must continue to pass

Requirements:

Application flow requirements:
- Extend the current tool-calling flow to support a second tool:
  - `getOrderItems`
- The LLM must be able to select `getOrderItems` when the user asks about order items
- After a `getOrderItems` tool call:
  - persist the assistant tool-call message
  - execute the tool
  - persist the tool result as a tool message
  - run the follow-up LLM call with the updated conversation context
  - persist the final assistant response
- The new tool must work in both:
  - single-turn requests
  - persisted multi-turn conversations using `conversationId`

Architecture requirements:
- Update `tools-definition.ts` to include the new tool definition for `getOrderItems`
- Keep the new tool input schema aligned with the existing status tool pattern
  - input should include `orderId`
- Extend `ToolExecutorService` to support dispatching:
  - `getOrderStatus`
  - `getOrderItems`
- Keep dispatch logic simple and explicit
- Extend the mocked `OrderRepository` with a new method:
  - `getOrderItems(orderId: string)`
- Keep the mocked order data centralized so status and items come from the same mock order source
- Return a clear and predictable structure from `getOrderItems`

Persistence requirements:
- Keep using the existing `MessageService`
- Ensure the following are still persisted for the new tool path:
  - user message
  - assistant tool-call message
  - tool result message
  - final assistant message
- Preserve message ordering and conversation continuity
- Do not introduce any new database tables or migrations

LLM integration requirements:
- Include `getOrderItems` in the list of tools passed to the LLM
- Keep the current `LlmGateway` contract unchanged
- Ensure the Anthropic integration continues to receive tool metadata in the existing format
- Ensure persisted tool messages for `getOrderItems` are mapped back correctly into LLM messages
- Preserve `toolName` and `toolUseId` for the new tool path just like the existing one
- Do not change provider abstraction or provider selection logic

Testing requirements:
- Add or update tests to cover:
  - direct item lookup through `getOrderItems`
  - multi-turn flow where the user first asks about the order and later asks about its items
  - unsupported tool behavior remains unchanged where applicable
  - tool executor support for both tools
  - repository mocked item lookup behavior
- Keep existing tests passing
- Prefer focused unit tests over broad unrelated changes

HTTP/API requirements:
- Keep using the `/ask` endpoint
- Keep request DTO unchanged
- Keep response shape unchanged

Suggested response shape:
```json
{
  "conversationId": "uuid",
  "type": "final_answer",
  "content": "..."
}