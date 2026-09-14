import pino from "pino";

/**
 * Single shared logger instance. Import this everywhere instead of
 * reaching for `console.log`.
 *
 * Logging is always verbose (level "trace"), regardless of environment.
 */
export const logger = pino({
  level: "trace",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});
