import { Elysia } from "elysia";
import { AppError } from "@/errors/error-types";
import { logger } from "@/loggers/logger";

/**
 * Central error-handling middleware. Catches `AppError`s thrown from
 * controllers/services and maps them to HTTP responses; logs everything else
 * as an unexpected 500.
 */
export const errorHandler = new Elysia().onError(({ error, set }) => {
  if (error instanceof AppError) {
    set.status = error.statusCode;
    return { error: error.message };
  }

  logger.error({ error }, "Unhandled error");
  set.status = 500;
  return { error: "Internal server error" };
});
