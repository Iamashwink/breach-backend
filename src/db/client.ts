import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/initializers/load-env";

/**
 * Shared Drizzle client. Only `models/` should import this —
 * services must go through `models`, never touch the DB directly.
 */
const queryClient = postgres(env.DATABASE_URL);

export const db = drizzle(queryClient);
