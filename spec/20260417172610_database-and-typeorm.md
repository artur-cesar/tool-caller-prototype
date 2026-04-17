Context:
This is a NestJS backend project used to study LLM tool calling.
The current codebase already has modules like ask, llm, order, and tools.
At this stage, I want only the database foundation for future conversation persistence.

Goal:
Set up PostgreSQL integration with TypeORM.

Constraints:
- Use NestJS patterns
- Keep architecture simple
- Do not implement conversation/message domain yet
- Use TypeORM with migrations
- Use PostgreSQL
- Configuration must come from environment variables
- Keep the database module reusable
- No overengineering
- No Dockerfile changes yet unless strictly necessary

Requirements:
- Install and configure TypeORM for NestJS
- Add a dedicated database module
- Configure a singleton DataSource for migrations
- Support environment variables for host, port, username, password, database
- Add migration setup
- Add npm scripts for:
  - migration:generate
  - migration:create
  - migration:run
  - migration:revert
- Ensure app startup can connect through TypeORM
- Keep the structure ready for future entities such as Conversation and Message
- Prefer a clean folder structure for database/config files

Out of scope:
- Creating Conversation entity
- Creating Message entity
- Creating repositories for business modules
- Seeding
- Auth
- Pagination
- Conversation endpoints

Definition of done:
- Project has PostgreSQL + TypeORM configured
- There is a dedicated DataSource file for CLI/migrations
- Migration commands work through package scripts
- Environment variables are documented or exemplified
- The setup is ready for future entities without extra refactoring

Implementation notes:
- Prefer a structure like:
  - src/database/database.module.ts
  - src/database/typeorm.config.ts
  - src/database/data-source.ts
  - src/database/migrations/
- Keep autoLoadEntities disabled if that helps keep things explicit
- Explain briefly why each new file exists