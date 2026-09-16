/**
 * Recognising the constraint violations the services deliberately rely on.
 *
 * Several checks in this codebase are "look, then write" — is this name taken,
 * is this team already on a path, does this join code exist. Under concurrency
 * the database is the only thing that can actually decide, so the write is
 * allowed to fail and the error is translated here into the same `AppError` the
 * look-first branch would have thrown. Without this the caller gets a bare 500.
 */

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

function pgCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/** The constraint the server named, if it named one. */
export function pgConstraint(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const e = error as { constraint_name?: unknown; constraint?: unknown };
  const name = e.constraint_name ?? e.constraint;
  return typeof name === "string" ? name : undefined;
}

/**
 * A unique-index violation, optionally narrowed to one constraint. Pass the
 * constraint name whenever the caller can only handle that specific collision —
 * treating an unrelated one as handled is how a real bug gets swallowed.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (pgCode(error) !== PG_UNIQUE_VIOLATION) return false;
  if (!constraint) return true;
  return pgConstraint(error) === constraint;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return pgCode(error) === PG_FOREIGN_KEY_VIOLATION;
}
