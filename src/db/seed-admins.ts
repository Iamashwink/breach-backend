/**
 * Seeds 3 Admin Accounts for BreachPoint CTF Management.
 *
 * Idempotent: safe to run multiple times. If an account with the specified
 * email or username already exists, it is promoted to admin, unbanned, and its
 * password is reset to the documented seed password.
 *
 * Usage:
 *   bun run db:seed:admins
 *   bun run src/db/seed-admins.ts
 */
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logger } from "@/loggers/logger";
import { coreUser } from "@/models/core/user";
import { hashPassword } from "@/services/auth/password.service";

export interface SeedAdminConfig {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export const SEED_ADMINS: SeedAdminConfig[] = [
  {
    username: "admin",
    email: "admin@breachpoint.net",
    password: process.env.ADMIN_1_PASSWORD || "AdminPassword2026!",
    displayName: "Lead Administrator",
  },
  {
    username: "ops",
    email: "ops@breachpoint.net",
    password: process.env.ADMIN_2_PASSWORD || "OpsPassword2026!",
    displayName: "CTF Operations",
  },
  {
    username: "control",
    email: "control@breachpoint.net",
    password: process.env.ADMIN_3_PASSWORD || "ControlPassword2026!",
    displayName: "Event Control",
  },
];

export async function seedAdmins(admins: SeedAdminConfig[] = SEED_ADMINS) {
  console.log("\n==================================================================");
  console.log("            BREACHPOINT — SEEDING 3 ADMIN ACCOUNTS               ");
  console.log("==================================================================\n");

  const results: Array<{
    status: "CREATED" | "UPDATED";
    username: string;
    email: string;
    password: string;
    displayName: string;
    userId: string;
  }> = [];

  for (const admin of admins) {
    const existing = (
      await db
        .select()
        .from(coreUser)
        .where(
          or(
            sql`lower(${coreUser.email}) = lower(${admin.email})`,
            sql`lower(${coreUser.username}) = lower(${admin.username})`,
          ),
        )
    )[0];

    const passwordHash = await hashPassword(admin.password);

    if (existing) {
      await db
        .update(coreUser)
        .set({
          email: admin.email,
          username: admin.username,
          displayName: admin.displayName,
          passwordHash,
          isAdmin: true,
          isBanned: false,
          bannedAt: null,
          bannedReason: null,
        })
        .where(eq(coreUser.id, existing.id));

      results.push({
        status: "UPDATED",
        username: admin.username,
        email: admin.email,
        password: admin.password,
        displayName: admin.displayName,
        userId: existing.id,
      });

      logger.info({ userId: existing.id, username: admin.username }, "admin: updated and verified");
    } else {
      const [created] = await db
        .insert(coreUser)
        .values({
          username: admin.username,
          email: admin.email,
          displayName: admin.displayName,
          passwordHash,
          isAdmin: true,
          isBanned: false,
        })
        .returning();

      results.push({
        status: "CREATED",
        username: admin.username,
        email: admin.email,
        password: admin.password,
        displayName: admin.displayName,
        userId: created!.id,
      });

      logger.info({ userId: created!.id, username: admin.username }, "admin: created");
    }
  }

  // Also preserve ashwin@gmail.com as admin if present
  const ashwin = (
    await db
      .select()
      .from(coreUser)
      .where(sql`lower(${coreUser.email}) = lower('ashwin@gmail.com')`)
  )[0];
  if (ashwin && !ashwin.isAdmin) {
    await db.update(coreUser).set({ isAdmin: true, isBanned: false }).where(eq(coreUser.id, ashwin.id));
    logger.info({ userId: ashwin.id }, "admin: ashwin@gmail.com ensured as admin");
  }

  console.log("---------------------------------------------------------------------------------------------------------");
  console.log(
    "STATUS   | USERNAME        | EMAIL                       | PASSWORD             | DISPLAY NAME",
  );
  console.log("---------------------------------------------------------------------------------------------------------");
  for (const r of results) {
    console.log(
      `${r.status.padEnd(8)} | ${r.username.padEnd(15)} | ${r.email.padEnd(27)} | ${r.password.padEnd(20)} | ${r.displayName}`,
    );
  }
  console.log("---------------------------------------------------------------------------------------------------------\n");
  console.log("All 3 admin accounts are configured and ready for login on /auth/login\n");

  return results;
}

if (import.meta.main) {
  seedAdmins()
    .then(() => {
      logger.info("seed:admins completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error: error instanceof Error ? error.message : error }, "seed:admins failed");
      process.exit(1);
    });
}
