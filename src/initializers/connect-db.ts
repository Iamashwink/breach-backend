import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logger } from "@/loggers/logger";

/**
 * Verifies DB connectivity at boot. Called once from `initializers/init.ts`.
 */
export async function connectToDB(): Promise<void> {
  try {
    await db.execute(sql`select 1`);
    logger.info("Connected to database");
  } catch (error) {
    logger.error({ error }, "Failed to connect to database");
    throw error;
  }
}
