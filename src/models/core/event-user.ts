import { foreignKey, index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "@/models/shared/timestamp_audit";
import { coreEvent } from "@/models/core/event";
import { coreUser } from "@/models/core/user";

/**
 * "This user has registered for this event." Precedes team membership —
 * a user registers, then creates or joins a team.
 */
export const coreEventUser = pgTable(
  "core_event_user",
  {
    eventId: uuid("event_id").notNull(),
    userId: uuid("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),

    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    foreignKey({ columns: [table.eventId], foreignColumns: [coreEvent.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.userId], foreignColumns: [coreUser.id] }).onDelete("cascade"),
    // "Which events has this user joined" — the PK only indexes event-first.
    index("core_event_user_user_idx").on(table.userId),
  ],
);
