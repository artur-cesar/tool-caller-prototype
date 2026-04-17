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

## ▶️ How To Run

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm run start:dev
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

## 🧠 What The Code Does

The application exposes a `POST /ask` endpoint.

It receives a user message, sends it to an LLM gateway together with tool definitions, and handles one of two outcomes:

- a direct final answer from the LLM
- a tool call request from the LLM

When the model requests a tool, the application executes the internal business logic for that tool, appends the tool result to the conversation, and sends the updated conversation back to the LLM to obtain the final answer.

Current example flow:

- user asks for an order status
- the LLM requests the `getOrderStatus` tool
- the application queries the internal order repository
- the tool result is returned to the LLM
- the LLM generates the final natural-language response

## 📬 API Example

Request:

```json
{
  "message": "I want to know the status of my order 789"
}
```

Success response:

```json
{
  "type": "final_answer",
  "content": "Your order 789 has been **DELIVERED**! Your order has successfully reached you."
}
```

Not found response:

```json
{
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

## 🪵 Logs Example

Below is a sanitized example of the runtime logs produced during the `/ask` flow.

```text
[Nest] LOG   [AskLogger] Calling LLM for initial ask flow
[Nest] DEBUG [AskLogger] initial messages: [{"role":"system","contentPreview":"You are a study assistant for experiments with LLM providers."},{"role":"user","contentPreview":"I want to know the status of my order ***"}]

[Nest] LOG   [AnthropicLogger] Sending request to Anthropic
[Nest] DEBUG [AnthropicLogger] Messages: [{"role":"system","contentPreview":"You are a study assistant for experiments with LLM providers."},{"role":"user","contentPreview":"I want to know the status of my order ***"}]
[Nest] DEBUG [AnthropicLogger] Tools: [{"name":"getOrderStatus","description":"Returns the status of an order by its ID."}]
[Nest] DEBUG [AnthropicLogger] System message: "You are a study assistant for experiments with LLM providers."
[Nest] DEBUG [AnthropicLogger] Mapped messages: [{"role":"user","content":"I want to know the status of my order ***"}]
[Nest] DEBUG [AnthropicLogger] Tool count: 1
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

## 🧩 Runtime Version Alignment

This repository also includes:

- `.nvmrc`
- `.npmrc`
- `engines` in `package.json`

These files keep local development and CI aligned on the expected Node.js and npm versions.

## 🚀 Next Steps

- add one more tool, for example `getOrderItems`, to explore multi-tool scenarios
- modify the LLM behavior by testing different system messages and comparing how the model reacts to the same user request
