import { foreignKey, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "@/models/shared/timestamp_audit";
import { szFragmentKey } from "@/models/event-specific/custom-types";
import { coreChallenge } from "@/models/core/challenge";
import { coreTeam } from "@/models/core/team";
import { coreEvent } from "@/models/core/event";

export const szConvergenceFragment = pgTable(
  "sz_convergence_fragment",
  {
    eventId: uuid("event_id").notNull(),
    teamId: uuid("team_id").notNull(),
    fragmentKey: szFragmentKey("fragment_key").notNull(),
    challengeId: uuid("challenge_id").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),

    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.fragmentKey] }),
    foreignKey({ columns: [table.eventId], foreignColumns: [coreEvent.id] }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.teamId],
      foreignColumns: [coreTeam.eventId, coreTeam.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.challengeId],
      foreignColumns: [coreChallenge.eventId, coreChallenge.id],
    }).onDelete("cascade"),
  ],
);
