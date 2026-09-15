import { boolean, check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authorship } from "@/models/shared/authorship";
import { timestamps } from "@/models/shared/timestamp_audit";
import { coreEvent } from "@/models/core/event";

export const szTimeGlitch = pgTable(
  "sz_time_glitch",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => coreEvent.id, { onDelete: "cascade" }),
    label: text("label"), // 'Glitch 03:17'
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    announced: boolean("announced").notNull().default(false),

    ...timestamps,
    ...authorship,
  },
  (table) => [check("sz_time_glitch_ends_after_starts", sql`${table.endsAt} > ${table.startsAt}`)],
);
