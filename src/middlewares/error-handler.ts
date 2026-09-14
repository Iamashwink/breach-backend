import { Elysia, ValidationError } from "elysia";
import { AppError } from "@/errors/error-types";
import { logger } from "@/loggers/logger";

/**
 * Central error-handling middleware. Catches `AppError`s thrown from
 * controllers/services and maps them to HTTP responses; logs everything else
 * as an unexpected 500.
 */
export const errorHandler = new Elysia().onError({ as: "global" }, ({ error, code, request, set }) => {
  const context = { method: request.method, url: request.url };

  if (error instanceof AppError) {
    set.status = error.statusCode;
    logger.warn(
      {
        ...context,
        statusCode: error.statusCode,
        errorName: error.name,
        message: error.message,
        stack: error.stack,
      },
      "Application error",
    );
    return { error: error.message };
  }

  // Elysia's own request-schema validation (from `t.Object(...)` on a route)
  // surfaces here as `code: "VALIDATION"` rather than an `AppError`. Its
  // `.message` is a multi-line JSON dump meant for logs, not API clients —
  // `.summary` on the first violation is the human-readable line.
  if (code === "VALIDATION") {
    set.status = 422;
    const summary =
      error instanceof ValidationError ? error.all[0]?.summary : undefined;
    logger.warn(
      { ...context, statusCode: 422, message: error.message, summary, stack: error.stack },
      "Request validation error",
    );
    return { error: summary ?? "Invalid input" };
  }

  if (code === "NOT_FOUND") {
    set.status = 404;
    logger.warn({ ...context, statusCode: 404 }, "Route not found");
    return { error: "Route not found" };
  }

  set.status = 500;
  const errorDetails =
    error instanceof Error
      ? { errorName: error.name, message: error.message, stack: error.stack }
      : { errorValue: error };
  logger.error({ ...context, statusCode: 500, ...errorDetails }, "Unhandled error");
  return { error: "Internal server error" };
});
