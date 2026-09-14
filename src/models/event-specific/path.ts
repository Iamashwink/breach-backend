import { char, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { authorship } from "@/models/shared/authorship";
import { timestamps } from "@/models/shared/timestamp_audit";
import { szFragmentKey } from "@/models/event-specific/custom-types";
import { coreEvent } from "@/models/core/event";

/**
 * Signal Zero module. Safe to DROP wholesale next year — sz_* tables reference
 * core_*, never the reverse.
 *
 * `code` is intentionally unconstrained beyond uniqueness: 'A'/'B'/'C' is this
 * year's content, not a schema fact, and pinning it in a CHECK would mean a
 * migration to add a fourth path.
 */
export const szPath = pgTable(
  "sz_path",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => coreEvent.id, { onDelete: "cascade" }),
    code: char("code", { length: 1 }).notNull(), // 'A' | 'B' | 'C'
    name: text("name").notNull(), // 'THE ARCHIVIST'
    delivers: szFragmentKey("delivers"),
    introNarration: text("intro_narration").notNull(),

    ...timestamps,
    ...authorship,
  },
  (table) => [
    unique().on(table.eventId, table.code),
    unique().on(table.id, table.eventId), // composite-FK target
  ],
);
