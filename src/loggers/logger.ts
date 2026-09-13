import pino from "pino";

/**
 * Single shared logger instance. Import this everywhere instead of
 * reaching for `console.log`.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});
