# breachpoint-backend

Bun + Elysia backend, structured as a clean-architecture layered app backed by Drizzle ORM + PostgreSQL.

## Getting started

```bash
cp .env.example .env
bun install
docker compose up -d postgres
bun run dev
```

## Folder structure

```
src/
├── index.ts          # app entrypoint
├── initializers/      # startup sequence: env validation, DB connection
├── loggers/            # shared pino logger instance
├── errors/            # custom error types (AppError, NotFoundError, ...)
├── db/                # Drizzle client + generated migrations
├── schema/
│   ├── dao/           # Drizzle table definitions, one file per resource
│   └── dto/           # request/response validation schemas, one file per resource
├── models/            # repository layer — the ONLY place that talks to the DB, one subfolder per resource
├── services/           # business logic / use cases, one subfolder per resource
├── controllers/         # parses requests, calls services, shapes responses, one subfolder per resource
├── routes/            # Elysia route definitions per resource + router.ts aggregating them all
├── middlewares/         # cross-cutting Elysia plugins (error handling, auth, ...)
├── utils/             # generic, business-logic-free helpers
└── types/             # shared TS types not tied to a schema
```

### Layer rules

- **routes → controllers → services → models → db.** Each layer only calls the one directly below it.
- **`services` never touch Drizzle/the DB directly** — only `models` may import `db/client.ts`. This keeps business logic testable and swappable independent of persistence.
- **`controllers` hold no business logic** — they validate input (via `schema/dto`), delegate to `services`, and shape the HTTP response.
- New resources get a same-named subfolder in `routes`, `controllers`, `services`, and `models`, plus a `schema/dao` and `schema/dto` file.

## Scripts

- `bun run dev` — start the dev server with hot reload
- `bun run db:generate` — generate a Drizzle migration from `schema/dao`
- `bun run db:migrate` — apply migrations
- `bun run db:studio` — open Drizzle Studio

## Docker

```bash
docker compose up -d postgres   # Postgres only, for local dev
docker compose up --build       # full stack (app + Postgres)
```
