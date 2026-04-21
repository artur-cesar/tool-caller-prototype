Context:
- This is a NestJS backend project used to study LLM tool calling.
- The project already exposes a `POST /ask` endpoint as the main application entrypoint.
- The current architecture already includes:
  - `AskService` as the entry point
  - a dedicated turn orchestration layer under `turn/`
  - `ToolExecutorService` under `tools/`
  - `LlmGateway` abstraction with an Anthropic implementation
  - `Conversation` and `Message` persistence via PostgreSQL + TypeORM
- The `/ask` endpoint already supports:
  - `message`
  - optional `conversationId`
  - optional `mode`
  - `x-user-id` header for user scoping
- The repository is intentionally a backend study project and should expose a clean API contract for exploration and testing.
- We now want Codex to add OpenAPI + Swagger support so the `/ask` endpoint is fully documented and easy to inspect in the browser.
- We also want Swagger UI to support an optional provider API key input so someone cloning the repository can test the app using their own provider key directly from the docs UI.
- The application should remain provider-key source agnostic:
  - it may use a provider API key sent in the request
  - or fall back to the server environment configuration
  - and it should fail fast with a clear error when no provider API key is available from either source
- NestJS officially supports OpenAPI generation through `@nestjs/swagger`, `SwaggerModule`, `DocumentBuilder`, and route/DTO decorators such as `@ApiOperation`, `@ApiBody`, `@ApiHeader`, `@ApiResponse`, and `@ApiProperty`.

Goal:
- Add OpenAPI + Swagger support to the NestJS application.
- Expose Swagger UI for the application.
- Fully document the `POST /ask` endpoint, including:
  - request body
  - optional `mode`
  - optional `conversationId`
  - required `x-user-id` header
  - optional provider API key header
  - response shape
  - relevant error responses where applicable
- Allow users to provide their own provider API key from Swagger UI through an OpenAPI security scheme or equivalent Swagger-supported input.
- Keep the app behavior provider-key source agnostic:
  - prefer request-provided provider API key when present
  - otherwise use environment configuration
  - otherwise fail fast
- Ensure the generated schema is useful and professional for backend study, debugging, and demo purposes.

Non-goals:
- Do not redesign the `/ask` business flow
- Do not change turn orchestration
- Do not redesign provider selection logic beyond the minimal provider API key resolution needed for request-header-or-env support
- Do not add unrelated endpoints just to “fill” the Swagger UI
- Do not add multiple Swagger specifications
- Do not introduce code generation for clients
- Do not replace existing DTO validation style
- Do not redesign the response contract of `/ask`
- Do not introduce persistence of provider API keys
- Do not add user authentication/authorization beyond documenting and reading existing/request headers required by the endpoint
- Do not implement a multi-provider selection UI in Swagger

Constraints:
- Use NestJS official Swagger/OpenAPI support via `@nestjs/swagger`
- Keep implementation simple and pragmatic
- Favor explicit decorators over magic or overengineering
- Keep the documentation focused on the real current API contract
- Preserve backward compatibility for the existing `/ask` endpoint behavior
- Keep the docs accurate to the real runtime behavior
- If DTO properties are used in the OpenAPI schema, ensure they are properly decorated so Swagger reflects them correctly
- The optional provider API key must be accepted through a request header documented in Swagger
- Swagger UI should let the user input the provider API key in a natural way, preferably through an OpenAPI security scheme shown in the Authorize flow
- The application must not require environment configuration when a valid provider API key is sent in the request
- The application must not require a request header when a valid provider API key is available in the environment
- If neither request header nor environment variable is available, the request must fail early with a clear and deterministic error

Behavior compatibility:
- Existing `/ask` runtime behavior must remain unchanged except for the addition of Swagger support and the new provider API key resolution behavior
- Existing request and response semantics must remain unchanged
- Existing tests unrelated to Swagger must continue to pass
- Existing multi-turn behavior must remain unchanged
- Existing Anthropic integration must remain unchanged except for how the provider API key is sourced
- Existing DTO validation behavior must remain unchanged unless a minimal documentation-oriented adjustment is required
- If the project currently uses only environment-based Anthropic credentials, it must continue to work exactly as before when the new request header is omitted
- If the new provider API key header is sent, the request should use it without requiring server-side environment fallback

Requirements:

Application flow requirements:
- Add Swagger bootstrap configuration to the application startup
- Swagger UI must be exposed on a stable path, e.g. `/docs`
- OpenAPI JSON should also be available through the Swagger setup generated by NestJS
- The documentation must reflect the real `/ask` endpoint contract without changing the endpoint flow
- The `/ask` endpoint must remain the main documented operation in this repository
- The application must support resolving the provider API key from:
  - request header first
  - environment second
- If no provider API key is available from either source, fail before invoking the LLM provider
- The failure must be explicit and easy to understand for someone testing the project from Swagger UI

Architecture requirements:
- Use `SwaggerModule` and `DocumentBuilder` in `main.ts` as recommended by NestJS official documentation
- Configure a meaningful base document including at least:
  - title
  - description
  - version
- Add a relevant tag for the ask operation, such as:
  - `ask`
  - or another project-consistent tag name
- Keep Swagger setup centralized in the application bootstrap
- Add controller-level and/or method-level OpenAPI decorators where appropriate
- Use DTO classes for schema generation instead of handwritten raw schemas wherever practical
- Ensure DTO properties are visible in Swagger using `@ApiProperty()` / `@ApiPropertyOptional()` or an equivalent already-supported project approach
- Add an OpenAPI security scheme for the optional provider API key header so Swagger UI can expose it in the browser
- The provider API key header name should be explicit and stable, for example:
  - `x-provider-api-key`
  - or `x-anthropic-api-key`
- Prefer a generic header name if it fits the project direction toward provider abstraction
- Keep provider API key resolution logic centralized in an application service/helper/guard/interceptor/context factory or equivalent pragmatic location
- Do not spread provider API key resolution logic across controllers and gateways unnecessarily
- The gateway should receive an already-resolved credential or access a clearly defined credential source abstraction rather than directly mixing HTTP/header parsing with provider-specific transport concerns

Persistence requirements:
- No database schema changes
- No new tables or migrations
- No persistence behavior changes
- Swagger/OpenAPI integration must be documentation-only from a persistence perspective
- Provider API keys must not be persisted in the database
- Provider API keys must not be stored in conversations, messages, or any application entity

LLM integration requirements:
- No change to `LlmGateway` behavior other than allowing the provider API key used for the request to come from request header or environment
- No change to Anthropic provider wiring beyond the minimal credential-resolution adaptation needed to support request-header-or-env behavior
- No change to tool execution flow
- Swagger docs must describe the current contract only, not invent future planner behavior
- If the `/ask` endpoint supports `mode`, document it exactly as implemented:
  - allowed enum values
  - optionality
  - default behavior if omitted
- If the endpoint uses `x-user-id` for conversation ownership/user scoping, document that header explicitly
- The Anthropic implementation must continue to work when the API key comes only from environment configuration
- The Anthropic implementation must also work when the API key is provided via request header for that specific request
- If the provider API key is missing from both sources, do not attempt the provider call

Security and observability requirements:
- Do not log provider API key values
- Do not include provider API key values in error messages
- Do not persist provider API key values
- Avoid accidentally exposing provider API key values through debug output, exceptions, or tracing metadata
- Error responses may mention that the provider API key is missing, but must not echo any submitted secret value
- Keep the implementation safe for a public demo/study repository

Testing requirements:
- Add or update tests only if the project already has a convention for testing bootstrap/app setup that would reasonably include Swagger
- At minimum, ensure the application still boots successfully with Swagger enabled
- If e2e tests are already present and practical, add focused tests to verify:
  - Swagger endpoint is reachable, for example `GET /docs`
  - OpenAPI JSON endpoint is reachable, if exposed by the setup
  - `/ask` still works when the provider API key comes from environment configuration
  - `/ask` can work when the provider API key is provided via request header
  - `/ask` fails clearly when neither request header nor environment key is available
- Do not add bloated or brittle tests for the full HTML output of Swagger UI
- Keep existing tests passing
- Prefer focused tests around contract visibility and credential resolution behavior rather than exhaustive Swagger snapshot testing

HTTP/API requirements:
- Fully document `POST /ask`
- Document the request body using the existing DTO shape
- The request body schema must include:
  - `message` as required string
  - `conversationId` as optional string
  - `mode` as optional enum with supported values:
    - `ORDER_STATUS_ONLY`
    - `ORDER_FULL`
- Document the `x-user-id` request header
  - mark it appropriately according to current runtime expectations
  - add description explaining its purpose
- Document the optional provider API key header
  - expose it in Swagger in a way that is easy for the user to fill in from the browser
  - prefer an OpenAPI security scheme using header-based apiKey input
  - explain that it is optional when the server environment already provides the credential
  - explain that it overrides environment fallback for that request when present
- Document the success response for `/ask`
- Document the response schema using DTOs or explicit response classes where appropriate
- The success response schema should include:
  - `conversationId`
  - `type`
  - `content`
- Add relevant response documentation for common failure cases if already part of the endpoint behavior, such as:
  - `400` validation error
  - `401`, `403`, or `500` only if they truly match the implemented behavior
  - a documented failure response when no provider API key is available from request or environment, using the real implemented status code
- Use method decorators such as:
  - `@ApiOperation`
  - `@ApiBody` if needed
  - `@ApiHeader`
  - `@ApiOkResponse` or `@ApiCreatedResponse`, matching the real implementation
  - `@ApiBadRequestResponse`
  - `@ApiInternalServerErrorResponse`
  - `@ApiSecurity`
  - or equivalent, following NestJS OpenAPI docs

Suggested request shape:
```json
{
  "message": "What are the items of this order?",
  "conversationId": "uuid",
  "mode": "ORDER_FULL"
}