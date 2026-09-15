import { boolean, check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authorship } from "@/models/shared/authorship";
import { timestamps } from "@/models/shared/timestamp_audit";

export const coreEvent = pgTable(
  "core_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(), // 'breachpoint-2026-r1'
    name: text("name").notNull(),
    description: text("description"),

    // Nullable while the event is still being drafted. `isPublished` is what
    // gates play, so the service layer requires both timestamps before it
    // will flip that flag.
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isPublished: boolean("is_published").notNull().default(false),
    isFrozen: boolean("is_frozen").notNull().default(false), // leaderboard freeze
    frozenAt: timestamp("frozen_at", { withTimezone: true }), // cutoff the frozen board reads to

    ...timestamps,
    ...authorship,
  },
  (table) => [
    check(
      "core_event_time_order_check",
      sql`${table.endsAt} IS NULL OR ${table.startsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`,
    ),
    // A published event must have a window; a draft need not.
    check(
      "core_event_published_has_window_check",
      sql`NOT ${table.isPublished} OR (${table.startsAt} IS NOT NULL AND ${table.endsAt} IS NOT NULL)`,
    ),
    check(
      "core_event_frozen_at_check",
      sql`NOT ${table.isFrozen} OR ${table.frozenAt} IS NOT NULL`,
    ),
  ],
);
