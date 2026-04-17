Context:
This is a NestJS backend project used to study LLM tool calling.
The project is now being prepared to run locally with PostgreSQL using Docker.
Postgres + TypeORM setup already exists or is being added separately.
Now I want to containerize the application and create a docker-compose setup for local development.

Goal:
Dockerize the NestJS application and add a docker-compose setup with app + PostgreSQL.

Constraints:
- Use a simple and clean local development setup
- Keep architecture straightforward
- Use Docker Compose with two services: app and postgres
- Add an explicit named volume for Postgres data
- Add an explicit custom network shared by app and postgres
- Do not use anonymous volumes for database persistence
- Do not hardcode environment values inside the source code
- Use environment variables for database connection
- Keep the setup suitable for development, not production-hardening
- add container name for application service
- add container name for database service
- No overengineering
- Do not add Redis, pgAdmin, or extra services

Requirements:
- Create a Dockerfile for the NestJS app
- Create a docker-compose.yml with:
  - app service
  - postgres service
  - named volume declared at the bottom for Postgres persistence
  - custom network declared at the bottom and used by both services
- The app service must connect to Postgres through the docker-compose service name
- Add or adjust environment variables so the app can run inside Docker
- Ensure the app starts correctly with the database container
- Prefer a setup that is easy to understand and maintain
- If necessary, add a .dockerignore
- If useful for startup ordering, use depends_on, but do not assume it guarantees DB readiness
- Keep the database hostname as the postgres service name, not localhost

Out of scope:
- Kubernetes
- Production deployment
- Nginx
- CI/CD changes
- Auth
- Conversation/message domain modeling
- Additional infrastructure services

Definition of done:
- The app can be started with docker compose up
- PostgreSQL persists data in a named volume
- App and database communicate over an explicit custom network
- Docker-related files are clear and minimal
- The compose file does not declare the database volume inline as a raw string inside the service when a named volume can be declared below
- Environment configuration is documented or exemplified

Implementation notes:
- Prefer a structure with:
  - Dockerfile
  - docker-compose.yml
  - .dockerignore
  - .env.example updates if needed
- For postgres persistence, prefer something like a named volume declared under top-level volumes:
  - postgres_data:
- For networking, prefer a top-level networks section and attach both services to the same named network
- Briefly explain why each created/updated file exists