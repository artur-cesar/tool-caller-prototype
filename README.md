# 🛠️ Tool Caller Prototype

## 🔎 Overview

This repository is a study project for exploring how LLMs can be integrated into backend applications with tool calling.

The goal is not only to call a model and return text, but to experiment with:

- provider abstraction
- tool call orchestration
- internal contracts for LLM interaction
- testable service boundaries
- observability through structured application logs

In short, this project is a small NestJS API used to explore how an application can talk to different LLM vendors without coupling business logic to a specific provider.

## 🧭 Spec-Driven Development With Codex

This codebase is being evolved using a spec-driven workflow with Codex. Instead
of implementing changes from vague prompts alone, each feature or refactor is
first described in a focused markdown spec under `spec/`, then implemented
against that document.

Why this works well here:

- it keeps each feature bounded and reviewable
- it makes architecture decisions explicit before code changes start
- it gives Codex a concrete contract for behavior, constraints, and non-goals
- it creates a readable historical trail of how the project evolved

Current specs in the repository:

- `database-and-typeorm.md`: PostgreSQL + TypeORM
  foundation, data source, migrations, and environment-driven configuration
- `docker-compose.md`: local Docker development setup with
  app + PostgreSQL, named volume, and explicit network
- `conversation-and-message-entities.md`: conversation and
  message entities, persistence services, and initial migration
- `multi-turn-conversation.md`: persisted multi-turn flow in
  `/ask`, using `conversationId` and `x-user-id`
- `extract-turn-ochestration-engine.md`: refactor from a
  concentrated `AskService` into a clearer turn orchestration structure
- `add-new-tool-get-order-items.md`: second tool,
  `getOrderItems`, plus multi-tool behavior and tests
- `enable-system-modes.md`: final system prompt experiment
  with ask modes that alter model behavior while keeping the same runtime tools
- `spec/spec_template.md`: base template used to author new specs consistently

In practice, each spec maps to a feature, refactor, or infrastructure step.
That makes the `spec/` directory a lightweight product and architecture log for
the project, not just scratch documentation.

## ⚙️ Stack

- Node.js
- TypeScript
- NestJS
- Jest
- ESLint
- Prettier
- Anthropic SDK
- PostgreSQL
- TypeORM

## ▶️ How To Run

**Note**: This project defines the required Node.js version in package.json (via engines) for use with `NVM`.
Before running any commands, make sure to run `nvm use` to align your local environment with the project's Node and npm versions.

```bash
# install dependencies
npm install

# run with npm
npm run start:dev

# Or run with docker compose (application + database)
npm run start:container

# migrations
npm run migration:run
```
Run unit tests:

```bash
npm test
npm run test:e2e
```

The migration scripts use `src/database/data-source.ts`, so future entities can
be added without refactoring the CLI setup.

## 🧠 What The Code Does

The application exposes a `POST /ask` endpoint and persists conversations and
messages in PostgreSQL.

Every `/ask` request:

- requires the `x-user-id` header
- creates or reuses a persisted conversation
- persists the incoming user message
- loads stored message history before calling the LLM
- persists assistant/tool messages generated during the flow

The LLM interaction still handles one of two outcomes:

- a direct final answer from the LLM
- a tool call request from the LLM

When the model requests a tool, the application executes the internal business
logic for that tool, persists the tool call and tool result, and sends the
updated conversation back to the LLM to obtain the final answer.

Current tools:

- `getOrderStatus`: returns the status of an order by `orderId`
- `getOrderItems`: returns the mocked item list of an order by `orderId`

Supported ask modes:

- `ORDER_FULL`: default mode. The system prompt allows status questions through
  `getOrderStatus` and item questions through `getOrderItems`.
- `ORDER_STATUS_ONLY`: constrained mode. The same runtime tool list is still
  sent to the LLM, but the system prompt explicitly allows only
  `getOrderStatus` and requires item-related requests to be refused.

This is the final controlled experiment in the repository: it demonstrates that
system messages can change LLM tool-calling behavior without changing backend
tool registration. In both modes, the application exposes the same tools to the
model. The behavioral difference comes from the internally selected system
prompt.

Known limitation:

- the prototype intentionally handles only one backend tool action per `/ask`
  execution
- composite requests such as "What is the status and items of order 123?" remain
  unsupported, and the assistant should ask the user to choose one request

Single-turn persisted flow:

- user asks for an order status
- the request includes `x-user-id`
- the application creates a conversation when `conversationId` is missing
- the user message is saved in the database
- the LLM requests the `getOrderStatus` tool
- the assistant tool-call message is saved
- the application queries the internal order repository
- the tool result is saved as a tool message
- the LLM generates the final natural-language response
- the final assistant answer is saved

Single-turn items flow:

- user asks for the items in an order
- the request includes `x-user-id`
- the application creates a conversation when `conversationId` is missing
- the user message is saved in the database
- the LLM requests the `getOrderItems` tool
- the assistant tool-call message is saved
- the application queries the internal order repository
- the tool result is saved as a tool message
- the LLM generates the final natural-language response using the tool output
- the final assistant answer is saved

Multi-turn persisted flow:

- the first request creates a conversation and returns its `conversationId`
- the next request sends the same `conversationId` and the same `x-user-id`
- the application loads the stored message history for that conversation
- the LLM receives the system prompt plus the persisted history in stable order
- any new assistant/tool messages generated in the second turn are also saved
- the latest user message is evaluated against the full persisted context, so a
  conversation can move from status lookup to item lookup without losing
  continuity

## 📬 API Definition

Endpoint:

```text
POST /ask
```

Headers:

| Header      | Required | Description                                                                                                                                   |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-user-id` | Yes      | Application-level user identifier used to track conversation ownership and ensure a user can only continue conversations that belong to them. |

Request body:

| Field            | Type                                  | Required | Default      | Description                                                                                                                                                                                                    |
| ---------------- | ------------------------------------- | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `message`        | `string`                              | Yes      | N/A          | Latest user message. Must be a non-empty string with at least 3 characters.                                                                                                                                    |
| `conversationId` | `string` UUID                         | No       | N/A          | Existing conversation ID. Send it to continue a multi-turn conversation, especially after clarification questions. Omit it to create a new conversation.                                                       |
| `mode`           | `'ORDER_STATUS_ONLY' \| 'ORDER_FULL'` | No       | `ORDER_FULL` | Selects the internal system prompt used for the LLM call. `ORDER_STATUS_ONLY` restricts the assistant to order status support. `ORDER_FULL` allows both status and item questions within the prototype limits. |

Response body:

| Field            | Type             | Description                                                                             |
| ---------------- | ---------------- | --------------------------------------------------------------------------------------- |
| `conversationId` | `string` UUID    | Conversation ID created or reused by the request. Use this value in follow-up requests. |
| `type`           | `'final_answer'` | Response type returned by the `/ask` endpoint.                                          |
| `content`        | `string`         | Final assistant answer.                                                                 |

Validation notes:

- invalid or missing `x-user-id` returns a validation error
- invalid `conversationId` values are rejected
- invalid `mode` values are rejected
- raw system prompt text is never accepted through the public API

## 📬 API Examples

Single-turn status request in `ORDER_STATUS_ONLY` mode:

```json
{
  "message": "I would like to know the status of my order 123",
  "mode": "ORDER_STATUS_ONLY"
}
```

Response:

```json
{
  "conversationId": "4d520f4d-82e5-4402-8828-b809a9cde045",
  "type": "final_answer",
  "content": "Your order 123 has a status of **PAID**."
}
```

Default mode status request:

```json
{
  "message": "I would like to know the status of my order 123"
}
```

Response:

```json
{
  "conversationId": "6c946605-8f24-42d8-90ce-8229a66ea111",
  "type": "final_answer",
  "content": "Your order 123 has been **PAID**."
}
```

Out-of-scope request:

```json
{
  "message": "I would like to have the pope's WhatsApp"
}
```

Response:

```json
{
  "conversationId": "5622b1e3-e212-4d84-b0ab-fcf314880ef9",
  "type": "final_answer",
  "content": "I appreciate the question, but I'm specifically designed to help with order support. I can assist you with:\n\n- **Order status** - checking the status of an order by its ID\n- **Order items** - finding out what items are in an order by its ID\n\nI don't have access to information about public figures, contact details, or anything outside of order-related queries.\n\nIs there an order I can help you with instead?"
}
```

Multi-turn clarification request:

```json
{
  "message": "I would like to know the status of my order"
}
```

Clarification response:

```json
{
  "conversationId": "97a10983-d1c2-4532-8c91-b94056e10b0a",
  "type": "final_answer",
  "content": "I'd be happy to help you check your order status! Could you please provide your **order ID**? Once you give me that, I can look up the current status for you."
}
```

Follow-up request with the same `conversationId`:

```json
{
  "conversationId": "97a10983-d1c2-4532-8c91-b94056e10b0a",
  "message": "The order id is 123"
}
```

Final response:

```json
{
  "conversationId": "97a10983-d1c2-4532-8c91-b94056e10b0a",
  "type": "final_answer",
  "content": "Your order status is **PAID**. \n\nIs there anything else you'd like to know about your order?"
}
```

Multi-turn item request in `ORDER_STATUS_ONLY` mode:

```json
{
  "conversationId": "97a10983-d1c2-4532-8c91-b94056e10b0a",
  "message": "And what are the items of this order?",
  "mode": "ORDER_STATUS_ONLY"
}
```

Capability limitation response:

```json
{
  "conversationId": "97a10983-d1c2-4532-8c91-b94056e10b0a",
  "type": "final_answer",
  "content": "I don't have the capability to provide information about order items. I can only assist with order status inquiries.\n\nIf you need details about what's in your order, please contact customer service for further assistance."
}
```

Multi-turn item request in `ORDER_FULL` mode:

```json
{
  "conversationId": "97a10983-d1c2-4532-8c91-b94056e10b0a",
  "message": "And what are the items of this order?",
  "mode": "ORDER_FULL"
}
```

Response:

```json
{
  "conversationId": "97a10983-d1c2-4532-8c91-b94056e10b0a",
  "type": "final_answer",
  "content": "Your order (123) contains the following items:\n- Keyboard\n- Mouse\n\nIs there anything else you'd like to know?"
}
```

## 🔌 Provider Adapter Pattern

The project uses an internal `LlmGateway` contract so the application layer does not need to know whether it is talking to Anthropic, a fake gateway, OpenAI, Ollama, or any other provider.

The application depends on the interface:

```ts
export interface LlmGateway {
  generate(input: {
    messages: LlmMessage[];
    tools?: ToolDefinition[];
  }): Promise<LlmResponse>;
}
```

The concrete implementation is selected in the Nest module through dependency injection.

Current wiring:

```ts
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AskController } from './ask/ask.controller';
import { AskLogger } from './ask/ask.logger';
import { AskService } from './ask/ask.service';
import { AnthropicLogger } from './llm/gateways/anthropic/anthropic.logger';
import { AnthropicLlmGateway } from './llm/gateways/anthropic/anthropic-llm.gateway';
import { LLM_GATEWAY } from './llm/types/llm.gateway';
import { OrderRepository } from './order/order.repository';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController, AskController],
  providers: [
    AppService,
    AskLogger,
    AskService,
    AnthropicLogger,
    OrderRepository,
    {
      provide: LLM_GATEWAY,
      useClass: AnthropicLlmGateway,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
```

To test another provider, the idea is simple:

1. create another class implementing `LlmGateway`
2. bind that class to `LLM_GATEWAY` in `AppModule`

That keeps the `AskService` unchanged while allowing different providers to be plugged in.

## 🔄 Request Flow

ASCII view of the current flow starting at `POST /ask`:

```text
+---------+
| Client  |
+----+----+
     |
     | POST /ask
     v
+----+------------------+
| AskController         |
| handle(body.message)  |
+----+------------------+
     |
     v
+----+------------------+
| AskService            |
| build messages/tools  |
+----+------------------+
     |
     v
+----+------------------+
| LLM_GATEWAY.generate  |
+----+------------------+
     |
     +------------------------------+
     |                              |
     | final_answer                 | tool_call
     |                              |
     v                              v
+----+------------------+   +------+-------------------+
| return response       |   | execute internal tool    |
+-----------------------+   | getOrderStatus(orderId)  |
                            +------+-------------------+
                                   |
                                   v
                            +------+-------------------+
                            | append tool result to    |
                            | conversation             |
                            +------+-------------------+
                                   |
                                   v
                            +------+-------------------+
                            | LLM_GATEWAY.generate     |
                            | with follow-up messages  |
                            +------+-------------------+
                                   |
                                   v
                            +------+-------------------+
                            | final_answer             |
                            +--------------------------+
```

## 🪵 Logs Examples

Below are sanitized examples of the runtime logs produced during `/ask`.

```text
[Nest] LOG   [AskLogger] Calling LLM for initial ask flow
[Nest] DEBUG [AskLogger] initial messages: [{"role":"system","contentPreview":"You are an assistant for order support experiments.\nYou can answer directly or call a tool when backend data is required..."},{"role":"user","contentPreview":"I want to know the status of my order ***"}]

[Nest] LOG   [AnthropicLogger] Sending request to Anthropic
[Nest] DEBUG [AnthropicLogger] Messages: [{"role":"system","contentPreview":"You are an assistant for order support experiments.\nYou can answer directly or call a tool when backend data is required..."},{"role":"user","contentPreview":"I want to know the status of my order ***"}]
[Nest] DEBUG [AnthropicLogger] Tools: [{"name":"getOrderStatus","description":"Returns the status of an order by its ID."},{"name":"getOrderItems","description":"Returns the items contained in an order by its ID."}]
[Nest] DEBUG [AnthropicLogger] System message: "You are an assistant for order support experiments.\nYou can answer directly or call a tool when backend data is required..."
[Nest] DEBUG [AnthropicLogger] Mapped messages: [{"role":"user","content":"I want to know the status of my order ***"}]
[Nest] DEBUG [AnthropicLogger] Tool count: 2
[Nest] LOG   [AnthropicLogger] Anthropic responded with stop reason tool_use
[Nest] DEBUG [AnthropicLogger] Raw response summary: {"id":"msg_xxx","model":"claude-haiku-4-5","stopReason":"tool_use","contentTypes":["tool_use"]}
[Nest] DEBUG [AnthropicLogger] Tool use block: {"type":"tool_use","id":"toolu_xxx","name":"getOrderStatus","input":{"orderId":"***"}}
[Nest] LOG   [AnthropicLogger] Anthropic requested tool getOrderStatus

[Nest] LOG   [AskLogger] Received tool_call from LLM during initial ask flow
[Nest] LOG   [AskLogger] Executing tool getOrderStatus for order *89
[Nest] DEBUG [AskLogger] Tool result: {"orderId":"***","status":"DELIVERED"}
[Nest] LOG   [AskLogger] Calling LLM for follow-up ask flow

[Nest] LOG   [AnthropicLogger] Sending request to Anthropic
[Nest] DEBUG [AnthropicLogger] Mapped messages: [{"role":"user","content":"I want to know the status of my order ***"},{"role":"assistant","content":[{"type":"tool_use","id":"toolu_xxx","name":"getOrderStatus","input":{"orderId":"***"}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_xxx","content":"{\"orderId\":\"***\",\"status\":\"DELIVERED\"}"}]}]
[Nest] LOG   [AnthropicLogger] Anthropic responded with stop reason end_turn
[Nest] LOG   [AnthropicLogger] Anthropic returned a final answer

[Nest] LOG   [AskLogger] Received final_answer from LLM during follow-up ask flow
```

These logs are useful for understanding:

- what was sent to the provider
- when the model requested a tool
- what business result was returned by the application
- when the final answer came back
- whether the runtime actually exposed the expected set of tools to the model
- Save API call credits 💰

## 🚀 Next Steps (completed)

- [x] add multi-turn conversation
- [x] add one more tool, `getOrderItems`, to explore multi-tool scenarios
- [x] modify the LLM behavior by testing different system messages and comparing how the model reacts to the same user request

This repository is part of a broader LLM study series focused on backend
integration patterns, provider boundaries, persistence, tool calling, and prompt
constraints.
