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

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm run start:dev
```

Run with Docker Compose:

```bash
docker compose up --build
```

Environment:

```bash
cp .env.example .env
```

Run unit tests:

```bash
npm test
```

Run e2e tests:

```bash
npm run test:e2e
```

Build:

```bash
npm run build
```

## 🗄️ Database Foundation

The project now includes a minimal PostgreSQL + TypeORM foundation for future
conversation persistence.

Files:

- `src/database/database.module.ts`: reusable Nest module that wires the TypeORM
  connection into the application.
- `src/database/typeorm.config.ts`: shared TypeORM option builder used by both
  Nest runtime startup and the CLI data source.
- `src/database/data-source.ts`: singleton `DataSource` instance required by the
  TypeORM CLI for migrations.
- `src/database/migrations/`: migration directory for schema changes.

Required database environment variables:

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`

Optional:

- `DATABASE_ENABLED=false` disables the TypeORM connection. The test suite uses
  `NODE_ENV=test`, so the database module stays off unless explicitly enabled.

Migration commands:

```bash
npm run migration:create --name=CreateConversationTables
npm run migration:generate --name=CreateConversationTables
npm run migration:run
npm run migration:revert
```

The migration scripts use `src/database/data-source.ts`, so future entities can
be added without refactoring the CLI setup.

## 🐳 Docker Setup

The project now includes a minimal local Docker setup with one NestJS container
and one PostgreSQL container.

Files:

- `Dockerfile`: builds the NestJS application image with the project
  dependencies and source code.
- `docker-compose.yml`: starts the `app` and `postgres` services, defines the
  shared network, and declares the named PostgreSQL volume.
- `.dockerignore`: keeps local-only files and large folders out of the Docker
  build context.

Notes:

- The app container connects to PostgreSQL using `DB_HOST=postgres`, which is
  the Compose service name.
- Docker Compose forces `DATABASE_ENABLED=true` for the app container, even if
  your local `.env` disables the database for other workflows.
- PostgreSQL data is persisted in the named volume `postgres_data`.
- App dependencies inside the container are persisted in the named volume
  `app_node_modules`.
- Both containers are attached to the explicit `tool-caller-network`.
- `PORT` controls both the NestJS listen port and the published app port in
  Docker Compose.
- The application source code is mounted into the container, and the app runs
  with `npm run start:dev` for hot reload during local development.
- `depends_on` is used with a PostgreSQL health check to improve startup
  ordering, but the setup still stays development-focused.

Development sync behavior:

- after the first `docker compose up --build`, local source changes are synced
  into the app container through a bind mount
- Nest runs in watch mode inside Docker, so code changes trigger automatic
  reloads without rebuilding the image
- if you change dependencies in `package.json`, rebuild the container with
  `docker compose up --build`

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

## 📬 API Example

Single-turn request:

Headers:

```text
x-user-id: user-1
```

Body:

```json
{
  "message": "I want to know the status of my order 789"
}
```

Success response:

```json
{
  "conversationId": "2c3a2f2d-09f7-46b8-8f93-53c534c96531",
  "type": "final_answer",
  "content": "Your order 789 has been **DELIVERED**! Your order has successfully reached you."
}
```

Single-turn items request:

Headers:

```text
x-user-id: user-1
```

Body:

```json
{
  "message": "I want to know the items of my order 123"
}
```

Success response:

```json
{
  "conversationId": "2c3a2f2d-09f7-46b8-8f93-53c534c96531",
  "type": "final_answer",
  "content": "Your order 123 contains the following items:\n- Keyboard\n- Mouse"
}
```

Multi-turn first request:

Headers:

```text
x-user-id: user-1
```

Body:

```json
{
  "message": "What is the status of my order?"
}
```

Example first response:

```json
{
  "conversationId": "2c3a2f2d-09f7-46b8-8f93-53c534c96531",
  "type": "final_answer",
  "content": "Which order?"
}
```

Multi-turn follow-up request:

Headers:

```text
x-user-id: user-1
```

Body:

```json
{
  "conversationId": "2c3a2f2d-09f7-46b8-8f93-53c534c96531",
  "message": "order 123"
}
```

Example follow-up response:

```json
{
  "conversationId": "2c3a2f2d-09f7-46b8-8f93-53c534c96531",
  "type": "final_answer",
  "content": "Your order #123 has a status of **PAID**."
}
```

Multi-turn capability switch example:

First request:

```json
{
  "message": "I want to know the status of my order 123"
}
```

First response:

```json
{
  "conversationId": "341a2682-d929-4d7f-9e03-33a6470d2369",
  "type": "final_answer",
  "content": "Your order #123 status is: **PAID**"
}
```

Follow-up request using the same conversation:

```json
{
  "conversationId": "341a2682-d929-4d7f-9e03-33a6470d2369",
  "message": "I want to know the items of my order 123"
}
```

Follow-up response:

```json
{
  "conversationId": "341a2682-d929-4d7f-9e03-33a6470d2369",
  "type": "final_answer",
  "content": "Your order 123 contains the following items:\n- Keyboard\n- Mouse"
}
```

Order not found response:

```json
{
  "conversationId": "2c3a2f2d-09f7-46b8-8f93-53c534c96531",
  "type": "final_answer",
  "content": "The status of your order **ID_INEXISTENT** is **NOT_FOUND**. \n\nThis means the order could not be found in the system. Please verify that you've provided the correct order ID. If you believe this is an error or have any questions, please double-check your order confirmation details."
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

Items lookup example:

```text
[Nest] LOG   [AskLogger] Calling LLM for initial ask flow
[Nest] DEBUG [AskLogger] initial messages: [{"role":"system","contentPreview":"You are an assistant for order support experiments.\nYou can answer directly or call a tool when backend data is required..."},{"role":"user","contentPreview":"I want to know the items of my order ***"}]

[Nest] LOG   [AnthropicLogger] Sending request to Anthropic
[Nest] DEBUG [AnthropicLogger] Tools: [{"name":"getOrderStatus","description":"Returns the status of an order by its ID."},{"name":"getOrderItems","description":"Returns the items contained in an order by its ID."}]
[Nest] DEBUG [AnthropicLogger] Tool count: 2
[Nest] LOG   [AnthropicLogger] Anthropic responded with stop reason tool_use
[Nest] DEBUG [AnthropicLogger] Tool use block: {"type":"tool_use","id":"toolu_xxx","name":"getOrderItems","input":{"orderId":"***"}}
[Nest] LOG   [AnthropicLogger] Anthropic requested tool getOrderItems

[Nest] LOG   [AskLogger] Received tool_call from LLM during initial ask flow
[Nest] LOG   [AskLogger] Executing tool getOrderItems for order *23
[Nest] DEBUG [AskLogger] Tool result: {"orderId":"***","found":true,"items":["Keyboard","Mouse"]}
[Nest] LOG   [AskLogger] Calling LLM for follow-up ask flow

[Nest] LOG   [AnthropicLogger] Sending request to Anthropic
[Nest] DEBUG [AnthropicLogger] Mapped messages: [{"role":"user","content":"I want to know the items of my order ***"},{"role":"assistant","content":[{"type":"tool_use","id":"toolu_xxx","name":"getOrderItems","input":{"orderId":"***"}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_xxx","content":"{\"orderId\":\"***\",\"found\":true,\"items\":[\"Keyboard\",\"Mouse\"]}"}]}]
[Nest] LOG   [AnthropicLogger] Anthropic responded with stop reason end_turn
[Nest] LOG   [AnthropicLogger] Anthropic returned a final answer
```

These logs are useful for understanding:

- what was sent to the provider
- when the model requested a tool
- what business result was returned by the application
- when the final answer came back
- whether the runtime actually exposed the expected set of tools to the model

## 🧩 Runtime Version Alignment

This repository also includes:

- `.nvmrc`
- `.npmrc`
- `engines` in `package.json`

These files keep local development and CI aligned on the expected Node.js and npm versions.

## 🚀 Next Steps

- [x] add multi-turn conversation
- [x] add one more tool, `getOrderItems`, to explore multi-tool scenarios
- [ ] modify the LLM behavior by testing different system messages and comparing how the model reacts to the same user request
