Context:
- This is a NestJS backend project used to study LLM tool calling.
- The project already supports persisted multi-turn conversations through the `/ask` endpoint using `conversationId` and `x-user-id`.
- The current architecture already includes:
  - `AskService` as the entry point
  - a dedicated turn orchestration layer under `turn/`
  - `ToolExecutorService` under `tools/`
  - `LlmGateway` abstraction with an Anthropic implementation
  - `Conversation` and `Message` persistence via PostgreSQL + TypeORM
- The system currently supports two tools:
  - `getOrderStatus`
  - `getOrderItems`
- The `OrderRepository` is intentionally mocked for study purposes and does not persist real orders in the database.
- The repository is intended to remain a simple tool-caller prototype, not a planner-based agent.
- We want to close this repository with one final controlled experiment showing that different system prompts can deterministically alter model behavior, even when the same runtime tools are available.

Goal:
- Add support for ask modes in the `/ask` request body so the backend can resolve different system prompts internally and demonstrate how prompt constraints change the model behavior.
- Introduce the following modes:
  - `ORDER_STATUS_ONLY`
  - `ORDER_FULL`
- Use those modes to prove that:
  - with the same runtime tool list available
  - the model can either refuse or use `getOrderItems`
  - depending only on the selected system prompt

Non-goals:
- Do not introduce planner logic
- Do not support multiple tool calls in a single `/ask` execution
- Do not decompose composite requests such as `status and items` into multiple steps
- Do not redesign turn orchestration
- Do not replace Anthropic or alter provider selection logic
- Do not expose raw system prompt text through the public API
- Do not select mode through HTTP headers
- Do not redesign persistence
- Do not add UI or playground screens
- Do not change ownership or authentication behavior

Constraints:
- Use NestJS patterns
- Keep architecture simple and pragmatic
- Reuse the current `AskService`, turn orchestration flow, and `LlmGateway`
- Preserve the current provider abstraction
- Preserve the current tool runtime list where tools are already passed to the LLM
- Do not “fake” mode behavior by removing tools from the runtime tool list
- The mode behavior must come from the selected system prompt, not from changing tool registration
- Avoid overengineering
- Keep the study focused on LLM tool-calling behavior and prompt-driven capability constraints

Behavior compatibility:
- Existing multi-turn conversation behavior must remain unchanged
- Existing `getOrderStatus` behavior must remain unchanged
- Existing `getOrderItems` behavior in full mode must remain unchanged
- Existing `/ask` request and response behavior must remain backward compatible except for the addition of the optional `mode` field
- Existing request flow must continue to support:
  - direct final answers
  - a tool call followed by a final answer
- Existing tests unrelated to system modes must continue to pass
- If `mode` is omitted, behavior must remain equivalent to the current “full” capability behavior

Requirements:

Application flow requirements:
- Extend the `/ask` flow to accept an optional `mode` field in the request body
- Supported modes must be:
  - `ORDER_STATUS_ONLY`
  - `ORDER_FULL`
- If `mode` is omitted, default to:
  - `ORDER_FULL`
- The selected mode must resolve an internal system prompt before sending the request to the LLM provider
- Keep the current tool-calling flow intact:
  - persist user message
  - call LLM
  - if tool call is returned:
    - persist assistant tool-call message
    - execute tool
    - persist tool result message
    - call LLM again with updated context
    - persist final assistant message
- In `ORDER_STATUS_ONLY` mode:
  - the assistant may use `getOrderStatus`
  - the assistant must not use `getOrderItems`
  - if asked about items, it must answer with a capability limitation response
- In `ORDER_FULL` mode:
  - the assistant may use `getOrderStatus` for status questions
  - the assistant may use `getOrderItems` for item questions
- Composite requests such as:
  - `What is the status and items of order 123?`
  must remain unsupported in this repository
- For composite requests, the assistant should explain that this prototype handles one backend tool action at a time

Architecture requirements:
- Introduce a strongly typed ask mode representation
  - e.g. enum, literal union, or equivalent project-standard approach
- Do not accept arbitrary system prompt strings from the request body
- Resolve the selected prompt internally from the chosen mode
- Replace the current single prompt constant approach with mode-based prompt definitions
- Suggested structure:
  - `ORDER_STATUS_ONLY_SYSTEM_PROMPT`
  - `ORDER_FULL_SYSTEM_PROMPT`
  - a resolver/map such as `SYSTEM_PROMPTS_BY_MODE`
- Keep the prompt resolution logic explicit and easy to read
- Preserve the current LLM provider abstraction and integration style
- Keep current tool metadata wiring unchanged except where needed to pass the selected system prompt
- Do not add dynamic tool registries or framework-heavy abstractions

Persistence requirements:
- Keep using the existing `MessageService`
- Preserve current message persistence behavior for all ask modes
- Ensure message ordering and conversation continuity remain unchanged
- No new tables or migrations must be introduced
- No change is required to message schema unless already necessary for the existing architecture

LLM integration requirements:
- The selected ask mode must determine which system prompt is sent to the LLM provider
- Keep the current `LlmGateway` contract unchanged unless a minimal change is strictly necessary
- Preserve the Anthropic integration through the existing abstraction
- Keep passing the same runtime tool list in the existing execution path
- Ensure the experiment truly proves:
  - same available tools
  - different system prompt
  - different model behavior
- The `ORDER_STATUS_ONLY` prompt must explicitly state that:
  - the assistant is restricted to order status support
  - the only allowed tool is `getOrderStatus`
  - `getOrderItems` must never be used, even if available
  - item-related questions must be refused with a clear capability limitation
- The `ORDER_FULL` prompt must explicitly state that:
  - `getOrderStatus` is only for status questions
  - `getOrderItems` is only for item questions
  - the assistant must choose the tool matching the latest user intent
  - composite requests requiring more than one backend tool action are out of scope for this prototype

Testing requirements:
- Add or update tests to cover:
  - default mode behavior when `mode` is omitted
  - `ORDER_STATUS_ONLY` status flow success
  - `ORDER_STATUS_ONLY` refusing item questions without using `getOrderItems`
  - `ORDER_FULL` successfully answering item questions through `getOrderItems`
  - composite request behavior remaining intentionally unsupported
- Include coverage for persisted multi-turn context where the order ID is established in earlier turns, for example:
  - user asks for order status
  - assistant asks which order
  - user replies with `Order 123`
  - later user asks: `What are the items of this order?`
- In `ORDER_STATUS_ONLY`, that multi-turn item question must be refused
- In `ORDER_FULL`, that multi-turn item question must succeed
- Keep existing tests passing
- Prefer focused tests over broad unrelated refactors

HTTP/API requirements:
- Keep using the `POST /ask` endpoint
- Extend the request DTO to accept:
  - `mode?: 'ORDER_STATUS_ONLY' | 'ORDER_FULL'`
- Default omitted `mode` to `ORDER_FULL`
- Reject invalid mode values according to the project’s current validation style
- Keep the existing response shape unchanged

Suggested request shape:
```json
{
  "message": "What are the items of this order?",
  "conversationId": "uuid",
  "mode": "ORDER_STATUS_ONLY"
}
```

Suggested response shape:
```json
{
  "conversationId": "uuid",
  "type": "final_answer",
  "content": "..."
}
```

Definition of done:
- `POST /ask` accepts an optional `mode` field in the request body
- Missing `mode` defaults to `ORDER_FULL`
- `ORDER_STATUS_ONLY` uses a dedicated system prompt that forbids item support
- `ORDER_FULL` uses a dedicated system prompt that allows both status and item support within current prototype limits
- The same runtime tool list remains available in both modes
- The behavior difference between modes is achieved by system prompt selection, not by removing tools
- `ORDER_STATUS_ONLY` refuses item questions even when `getOrderItems` exists in runtime
- `ORDER_FULL` answers item questions correctly through `getOrderItems`
- Composite requests such as `status and items` remain intentionally unsupported
- Automated tests cover the behavior difference between the two modes
- `README.md` is updated in raw Markdown to document:
  - repository purpose
  - supported modes
  - the system prompt experiment
  - known limitation around one backend tool action per ask
  - note that this repo is part of a broader LLM study series
- All changes are committed in small, meaningful conventional commits
- Each commit includes a Codex co-author trailer

Git workflow requirements:
- Create and use a feature branch for this work
- Suggested branch name:
  - `feat/system-modes`
- Use small, focused conventional commits
- Keep logically related changes grouped together
- Add Codex as co-author in every commit using the configured identity if available
- If no configured identity is available, use the standard fallback trailer:
  - `Co-authored-by: OpenAI Codex <codex@openai.com>`

Suggested commit breakdown:
- `feat(ask): add mode field to ask request contract`
- `feat(prompt): introduce mode-based system prompts`
- `feat(ask): resolve system prompt from selected mode`
- `test(ask): cover system mode behavior across full and status-only modes`
- `docs(readme): document system modes, prototype limits, and study-series context`