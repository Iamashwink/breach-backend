import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/db/client";
import { loadEnvVariables } from "@/initializers/load-env";
import { connectToDB } from "@/initializers/connect-db";
import { logger } from "@/loggers/logger";

/**
 * Runs the full startup sequence. Called once from `index.ts` before
 * the Elysia app starts listening.
 */
export async function init(): Promise<void> {
  loadEnvVariables();
  // await migrate(db, { migrationsFolder: "./src/db/migrations" });
  await connectToDB();
  logger.info("Initialization complete");
}
