import { foreignKey, index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "@/models/shared/timestamp_audit";
import { szUnlockSource } from "@/models/event-specific/custom-types";
import { coreChallenge } from "@/models/core/challenge";
import { coreTeam } from "@/models/core/team";
import { coreEvent } from "@/models/core/event";

/**
 * Materialised reveal state. The reveal rule ("2 revealed, then each solve
 * reveals one more, always 3 exposed") is app logic; this table is the
 * result, so the event page is one cheap query instead of recomputing the
 * rule on every load.
 */
export const szUnlockedChallenge = pgTable(
  "sz_unlocked_challenge",
  {
    eventId: uuid("event_id").notNull(),
    teamId: uuid("team_id").notNull(),
    challengeId: uuid("challenge_id").notNull(),
    source: szUnlockSource("source").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),

    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.challengeId] }),
    foreignKey({ columns: [table.eventId], foreignColumns: [coreEvent.id] }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.teamId],
      foreignColumns: [coreTeam.eventId, coreTeam.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.challengeId],
      foreignColumns: [coreChallenge.eventId, coreChallenge.id],
    }).onDelete("cascade"),
    index("sz_unlocked_challenge_event_team_idx").on(table.eventId, table.teamId),
  ],
);
