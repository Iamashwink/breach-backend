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
  await connectToDB();

  // Applies anything in meta/_journal.json that this database has not seen.
  // Runs after the connectivity check so a bad DATABASE_URL fails with
  // "Failed to connect" rather than a migration stack trace.
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  logger.info("Migrations up to date");

  logger.info("Initialization complete");
}
