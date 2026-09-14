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
├── models/            # Drizzle table/view definitions — the ONLY place that
│                      #   imports db/client.ts, one file per resource, plus
│                      #   columns.ts/authorship.ts/custom-types.ts (shared
│                      #   column sets and enums) and core/ + event-specific/
├── services/           # business logic / use cases, one subfolder per resource
├── controllers/         # parses requests, calls services, shapes responses, one subfolder per resource
├── routes/            # Elysia route definitions per resource + router.ts aggregating them all
├── middlewares/         # cross-cutting Elysia plugins (error handling, auth, ...)
├── utils/             # generic, business-logic-free helpers
└── types/             # shared TS types not tied to a schema (request/response DTOs, etc.)
```

### Layer rules

- **routes → controllers → services → models → db.** Each layer only calls the one directly below it.
- **`services` never touch Drizzle/the DB directly** — only `models` may import `db/client.ts`. This keeps business logic testable and swappable independent of persistence.
- **`controllers` hold no business logic** — they validate input (via `types`/request schemas), delegate to `services`, and shape the HTTP response.
- New resources get a same-named subfolder in `routes`, `controllers`, `services`, and a file in `models`.

## Data model

Tables live in `src/models/`, split into `core/` (reusable CTF engine) and
`event-specific/` (`sz_*`, the Signal Zero module — safe to drop wholesale
after the event; `sz_*` references `core_*`, never the reverse). Shared
categorical vocabularies are Postgres enums declared once in
`src/models/custom-types.ts` and re-exported as TS unions, so the database and
the service layer cannot drift.

### Scoring identity

Every competing unit is a **team** — solo players get a team of one
(`core_team.is_solo`). `core_team` is both the competing unit and its
registration in an event — the key everything scores against; `core_team_member`
is the single source of truth for membership. (There used to be a separate
`core_participant` paired 1:1 with each team; it was collapsed into `core_team`
to drop a join from every scoreboard read.) Every "which teammate did this"
column (`core_solve.solved_by`, `core_submission.submitted_by`, ...)
foreign-keys into `core_team_member (event_id, user_id)`, so an actor is
always a registered, team-affiliated user in that event.

### There is no `is_deleted`

Deletion is modelled per-table with the state the domain actually needs:

| Intent | Mechanism |
| --- | --- |
| Pull a broken challenge mid-event | `core_challenge.state = 'hidden'` |
| Remove a player from play | `core_user.is_banned` |
| Keep admin/test entries off the board | `core_team.is_hidden` |
| Disqualify a team, keep the evidence | `core_team.disqualified_at` + reason |
| Reverse a solve (bad flag, cheating) | `core_solve.revoked_at` + reason |
| Erase an account | anonymise `core_user` in place — see the comment on `core_user` |
| Retire an event | `DELETE` the `core_event` row; children cascade |

A blanket soft-delete flag was removed because it silently broke every unique
constraint in the schema: a "deleted" user still owned their username, and a
"deleted" team still owned its name and could never re-register.
`core_submission` is append-only — never updated, never deleted — so it
carries neither `updated_at` nor any deletion state.

### Querying the views

`core_leaderboard` and `core_challenge_solve_count` carry `event_id` through
every aggregate and `GROUP BY` it, so **always query them with a
`WHERE event_id = $1` predicate** — that is what lets Postgres push the filter
into the aggregation instead of summing every solve in the database. A frozen
leaderboard is a separate, time-bounded query against `core_solve`, not a mode
of this view.


## Scripts

- `bun run dev` — start the dev server with hot reload
- `bun run db:generate` — generate a Drizzle migration from `src/models`
- `bun run db:migrate` — apply migrations manually; application startup also applies pending migrations
- `bun run db:studio` — open Drizzle Studio

## Docker

```bash
docker compose up -d postgres   # Postgres only, for local dev
docker compose up --build       # full stack (app + Postgres)
```
