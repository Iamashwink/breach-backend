import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/initializers/load-env";

/**
 * Shared Drizzle client. Only `models/` should import this —
 * services must go through `models`, never touch the DB directly.
 */
const queryClient = postgres(env.DATABASE_URL);

export const db = drizzle(queryClient);

/**
 * Either the pooled client or an open transaction.
 *
 * Repository functions that participate in a multi-write unit of work take one
 * of these as a trailing argument defaulting to `db`, so the same function
 * serves a standalone call and a step inside `db.transaction(...)` without a
 * parallel set of "tx" variants. Flag submission is the reason this exists:
 * the submission row, the solve, the reveal writes and the fragment must land
 * together or not at all.
 */
export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
