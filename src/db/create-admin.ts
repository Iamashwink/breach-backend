/**
 * Creates or promotes an admin.
 *
 * Signup deliberately cannot mint one — `/auth/signup` always sets
 * `is_admin = false`, because an event where anyone can register themselves as
 * an admin has no admin routes worth guarding. So the first admin has to come
 * from someone with database access, which is this script.
 *
 *   bun run db:admin -- --email ops@axios.net --password '...' --username ops
 *   bun run db:admin -- --email ops@axios.net            # promote an existing user
 *
 * Idempotent: promoting an admin twice is a no-op, and re-running with a
 * password resets it.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logger } from "@/loggers/logger";
import { coreUser } from "@/models/core/user";
import { hashPassword } from "@/services/auth/password.service";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : undefined;
};

async function main() {
  const email = arg("email");
  const password = arg("password");
  const username = arg("username");

  if (!email) throw new Error("--email is required");

  const existing = (
    await db.select().from(coreUser).where(sql`lower(${coreUser.email}) = lower(${email})`)
  )[0];

  if (existing) {
    const patch: { isAdmin: boolean; passwordHash?: string; isBanned?: boolean } = { isAdmin: true };
    if (password) patch.passwordHash = await hashPassword(password);
    // A banned admin can log in but not act; promoting one that stays banned
    // would look like the promotion silently failed.
    if (existing.isBanned) patch.isBanned = false;

    await db.update(coreUser).set(patch).where(eq(coreUser.id, existing.id));
    logger.info(
      { userId: existing.id, username: existing.username, passwordReset: !!password },
      "admin: existing user promoted",
    );
    return;
  }

  if (!password || !username)
    throw new Error(`No user with email "${email}" — pass --username and --password to create one`);
  if (password.length < 8) throw new Error("--password must be at least 8 characters");

  const [created] = await db
    .insert(coreUser)
    .values({ username, email, passwordHash: await hashPassword(password), isAdmin: true })
    .returning();

  logger.info({ userId: created!.id, username }, "admin: created");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error: error instanceof Error ? error.message : error }, "admin: failed");
    process.exit(1);
  });
