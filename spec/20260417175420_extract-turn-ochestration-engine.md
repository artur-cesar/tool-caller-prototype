Context:
This is a NestJS backend project used to study LLM tool calling.

The project already has:
- PostgreSQL + TypeORM configured
- Conversation and Message entities/modules/services
- a working `/ask` flow supporting persisted multi-turn conversations
- tool-calling support with a single tool (`getOrderStatus`)
- conversation ownership via `x-user-id` header
- LLM abstraction via `LlmGateway` with an Anthropic implementation

Current situation:
- The `AskService` is responsible for:
  - conversation access (find/create + ownership validation)
  - message persistence
  - building LLM messages
  - mapping persisted messages to LLM format
  - executing tool calls
  - orchestrating the LLM + tool loop

This concentration of responsibilities makes the code harder to evolve for:
- additional tools
- history truncation
- prompt variations
- improved orchestration logic

Goal:
Refactor the `/ask` flow to extract a clear **turn orchestration engine** and separate responsibilities without changing current behavior.

Non-goals:
- Do not add new tools
- Do not change prompt behavior
- Do not change database schema
- Do not introduce authentication
- Do not add new external dependencies
- Do not redesign the LLM abstraction
- Do not implement token counting or advanced truncation strategies yet

Constraints:
- Use NestJS patterns
- Keep architecture simple and pragmatic
- Reuse existing modules (conversation, message, order)
- Do not create custom repository classes
- Avoid overengineering
- Preserve the current LLM provider abstraction (`LlmGateway`)
- Preserve the current tool-calling behavior exactly
- Keep HTTP contract unchanged

Behavior compatibility:
- `/ask` must behave exactly as before from the API perspective
- Multi-turn conversation behavior must remain unchanged
- Tool-calling flow must remain unchanged
- Message persistence must remain unchanged
- Existing tests must continue to pass (or be minimally updated if necessary)

Requirements:

Application flow requirements:
- Introduce a dedicated service responsible for orchestrating a single conversation turn
  - Suggested name: `TurnRunnerService`
- This service must:
  - build conversation messages
  - call the LLM
  - interpret the response
  - handle tool calls when present
  - execute the tool
  - persist tool results
  - perform the follow-up LLM call
  - persist the final assistant response

Architecture requirements:

- Refactor `AskService` to:
  - delegate conversation access to a dedicated service
  - delegate turn execution to `TurnRunnerService`
  - remain a thin orchestration entry point

- Extract conversation access logic into:
  - `ConversationAccessService`
  - responsibilities:
    - find or create conversation
    - validate ownership via `x-user-id`
    - throw appropriate exceptions

- Extract message mapping logic into:
  - `ConversationMessageMapper`
  - responsibilities:
    - map persisted `Message` entities into `LlmMessage`
    - support roles:
      - user
      - assistant
      - tool
    - preserve `toolName` and `toolUseId`

- Extract history building into:
  - `ConversationHistoryBuilder`
  - responsibilities:
    - load persisted messages
    - prepend system prompt
    - convert messages using the mapper

- Introduce (even if minimal):
  - `ConversationHistoryTruncator`
  - responsibilities:
    - receive full message list
    - return a truncated list (initially may return unchanged input)

Tool execution requirements:
- Extract tool execution logic from `AskService` into:
  - `ToolExecutorService`
- Responsibilities:
  - receive `toolName` and `arguments`
  - execute the correct tool
  - return the result
- Initially support only:
  - `getOrderStatus`
- Do not introduce complex registry patterns yet

LLM integration requirements:
- Keep using `LlmGateway`
- Do not change the interface contract
- Do not change how tools are passed
- Optionally extract:
  - Anthropic request mapping into `anthropic-request.mapper`
  - Anthropic response parsing into `anthropic-response.mapper`
- Ensure provider-specific logic remains inside the gateway layer

Persistence requirements:
- Keep using existing `MessageService`
- Ensure the following messages are still persisted:
  - user message
  - assistant tool-call message
  - tool result message
  - final assistant message
- Maintain correct ordering

HTTP/API requirements:
- Keep `/ask` endpoint unchanged
- Keep request DTO unchanged
- Keep response format unchanged

Suggested response shape:
```json
{
  "conversationId": "uuid",
  "type": "final_answer",
  "content": "..."
}