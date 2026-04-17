Context:
This is a NestJS backend project used to study LLM tool calling.
The project already has:
- PostgreSQL + TypeORM configured
- Conversation and Message entities/modules/services
- a working AskService that currently handles a stateless LLM flow
- ownership modeled via `x-user-id` header
- no authentication system
- no users table

The next step is to integrate conversation persistence into the `/ask` flow so the system can support real multi-turn interactions.

Goal:
Refactor the `/ask` flow to support persisted multi-turn conversations using `conversationId` and `x-user-id`.

Constraints:
- Use NestJS patterns
- Keep architecture simple
- Reuse existing Conversation and Message modules/services
- Do not introduce authentication
- Do not create a users table
- Do not create custom repository classes
- Do not overengineer
- Keep the current LLM provider abstraction intact
- Preserve the current tool-calling behavior, but make it conversation-aware

Requirements:
- Update the `/ask` flow to accept:
  - `message: string`
  - `conversationId?: string`
- Read `x-user-id` from the request header
- If `conversationId` is not provided:
  - create a new conversation owned by the given `x-user-id`
- If `conversationId` is provided:
  - load the conversation
  - ensure it belongs to the given `x-user-id`
  - reject access if it does not belong to that user
- Persist the incoming user message
- Load the persisted message history for the conversation
- Build the LLM input from:
  - the system prompt
  - the stored conversation history
- Keep message ordering correct and stable
- create/update unit tests

Tool-calling flow requirements:
- If the LLM returns a final answer:
  - persist it as an assistant message
  - return it in the HTTP response
- If the LLM returns a tool call:
  - persist the assistant tool-call message
  - execute the tool as today
  - persist the tool result as a tool message
  - run the follow-up LLM call using the updated conversation context
  - persist the final assistant answer
  - return it in the HTTP response

History mapping requirements:
- Map persisted messages back into LLM messages correctly:
  - user -> user
  - assistant -> assistant
  - tool -> tool
- Preserve `toolName` and `toolUseId` when reconstructing tool-related messages for the LLM
- Do not include unsupported roles

HTTP/API requirements:
- Keep using the `/ask` endpoint
- Update the request DTO to support optional `conversationId`
- Return `conversationId` in every response
- Return the final assistant response in a format that is easy to test manually in Insomnia

Suggested response shape:
```json
{
  "conversationId": "uuid",
  "type": "final_answer",
  "content": "..."
}

Git workflow requirements:
- Work in small, logical increments
- Create clear commits as each meaningful step is completed
- Use Conventional Commits
- Keep commit messages scoped to the actual change delivered
- Avoid one large final commit for the whole task

Commit guidance:
- Prefer commits that reflect real behavioral or architectural changes
- Each commit should represent a coherent step that can be understood in isolation
- Group related changes that belong to the same behavior (e.g., DTO + service usage) in a single commit
- Do not split tightly coupled changes across multiple commits

Suggested commit breakdown for this feature:
- feat(ask): add conversationId support to ask dto and response contract
- feat(ask): extract x-user-id from request and validate input
- feat(ask): integrate conversation creation and ownership validation
- feat(ask): persist user messages in ask flow
- feat(ask): load conversation history and map to llm messages
- feat(ask): persist assistant responses
- feat(ask): persist tool call and tool result messages
- feat(ask): implement follow-up llm call after tool execution
- test(ask): cover multi-turn conversation flow
- test(ask): cover ownership validation and rejection scenarios

Rules:
- Do not create generic commits like "update code" or "fix stuff"
- Do not mix refactor and feature changes in the same commit unless strictly necessary
- Use "feat", "fix", "refactor", "test", "chore" correctly
- Keep commit titles concise and descriptive (max ~70 chars)

Optional but recommended:
- When relevant, include a short body explaining the reason behind the change