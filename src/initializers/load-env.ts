import { logger } from "@/loggers/logger";

const REQUIRED_ENV_VARS = ["DATABASE_URL", "JWT_SECRET"] as const;

export const env = {
  PORT: Number(process.env.PORT ?? 8080),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "*",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "",
};

/**
 * Validates that required environment variables are present.
 * Called once at boot from `initializers/init.ts`.
 */
export function loadEnvVariables(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error({ missing }, "Missing required environment variables");
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  logger.info("Environment variables loaded");
}
