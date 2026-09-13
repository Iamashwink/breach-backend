import { Elysia } from "elysia";
import { AppError } from "@/errors/error-types";
import { logger } from "@/loggers/logger";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

export const errorHandler = new Elysia().onError(({ error, set }) => {
  if (error instanceof AppError) {
    set.status = error.statusCode;
    return { error: error.message };
  }

  if (isUniqueViolation(error)) {
    set.status = 409;
    return { error: "Resource already exists" };
  }

  logger.error({ error }, "Unhandled error");
  set.status = 500;
  return { error: "Internal server error" };
});
