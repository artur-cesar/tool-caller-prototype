Context:
This is a NestJS backend project used to study LLM tool calling.
The project already has PostgreSQL + TypeORM configured.
The next step is to add conversation persistence to support multi-turn interactions.

We will use a simple ownership model based on the `x-user-id` request header.
At this stage, there is no authentication system and no `users` table.
Conversation ownership should be stored directly as a string field on the conversation entity.

Goal:
Create the Conversation and Message modules, including TypeORM entities and service methods that support the current multi-turn LLM use case.

Constraints:
- Use NestJS patterns
- Keep architecture simple
- Use TypeORM entities
- Do not create custom repository classes
- Do not introduce authentication
- Do not create a users table
- Store the owner identifier as a string field (`userId`) on the Conversation entity
- No overengineering

Requirements:
- Create a `conversation` module
- Create a `message` module
- Add TypeORM entities for `Conversation` and `Message`
- Add the relationship between them
- Support message roles:
  - user
  - assistant
  - tool
- `Conversation` must contain:
  - id
  - userId
  - createdAt
  - updatedAt
- `Message` must contain:
  - id
  - conversationId
  - role
  - content
  - toolName (nullable)
  - toolUseId (nullable)
  - createdAt
- Generate a migration for these tables

Service expectations:
Create services with only methods that are clearly useful for the current context.

ConversationService should support methods such as:
- create(userId: string)
- findById(id: string)
- findByIdAndUserId(id: string, userId: string)

MessageService should support methods such as:
- createUserMessage(conversationId: string, content: string)
- createAssistantMessage(conversationId: string, content: string)
- createToolMessage(conversationId: string, toolName: string, toolUseId: string, content: string)
- listByConversationId(conversationId: string)

Behavior notes:
- Keep services focused on persistence and simple domain operations
- Do not add orchestration logic into these services
- Do not implement controllers yet unless clearly necessary for wiring
- If module exports are needed for AskService integration later, export the services

Out of scope:
- Authentication
- Authorization guards
- Users table
- Conversation summaries
- Pagination
- Soft delete
- Status fields
- Domain repositories
- Controller endpoints for conversation/message CRUD
- Refactoring AskService to use these modules yet

Implementation notes:
- Prefer UUID primary keys
- Prefer an enum for message role if it keeps the model clean
- Keep nullable fields explicit
- Keep timestamps explicit
- Keep entity and service names singular/plural consistent with the project style
- Briefly explain why each created file exists

Git workflow requirements:
- Work in small, logical increments
- Create clear commits as each meaningful step is completed
- Use Conventional Commits
- Keep commit messages scoped to the actual change delivered
- Avoid one large final commit for the whole task

Commit guidance:
- Prefer commits that reflect real architectural progress, for example:
  - feat(conversation): add conversation entity and migration
  - feat(message): add message entity and migration
  - feat(conversation): add conversation module and service
  - feat(message): add message module and service
- If a migration is created together with an entity, keep them in the same commit when they belong to the same change
- Do not create artificial commits for trivial formatting-only noise unless it is a standalone cleanup

Definition of done:
- Conversation and Message modules exist
- Entities are mapped correctly with TypeORM
- Migration is created for both tables
- Services expose the minimum useful methods for the upcoming multi-turn flow
- Code is easy to extend from AskService in the next step