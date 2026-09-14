import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "@/models/shared/timestamp_audit";

export const coreUser = pgTable(
  "core_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    isAdmin: boolean("is_admin").notNull().default(false),

    // Bans are the account-level "remove from play" mechanism. A banned user
    // keeps their row, their solves and their history; they just cannot act.
    isBanned: boolean("is_banned").notNull().default(false),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    bannedReason: text("banned_reason"),

    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    ...timestamps,
  },
  (table) => [
    // Case-insensitive uniqueness. Plain `.unique()` let `Alice` and `alice`
    // both register, which is a real account-takeover vector on a CTF.
    uniqueIndex("core_user_username_uq").on(sql`lower(${table.username})`),
    uniqueIndex("core_user_email_uq").on(sql`lower(${table.email})`),
  ],
);
