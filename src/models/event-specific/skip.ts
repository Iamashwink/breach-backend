import { foreignKey, index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "@/models/shared/timestamp_audit";
import { coreChallenge } from "@/models/core/challenge";
import { coreEvent } from "@/models/core/event";
import { coreTeam } from "@/models/core/team";
import { coreTeamMember } from "@/models/core/team-member";
import { szTeamPath } from "@/models/event-specific/team-path";

/**
 * Using a skip closes a challenge without a flag AND drops that path
 * attempt's multiplier (the app writes both in one transaction). No core_solve
 * row is written, so a skipped challenge is worth zero, not a fraction.
 */
export const szSkip = pgTable(
  "sz_skip",
  {
    eventId: uuid("event_id").notNull(),
    teamId: uuid("team_id").notNull(),
    challengeId: uuid("challenge_id").notNull(),
    teamPathId: uuid("team_path_id").notNull(),
    usedBy: uuid("used_by"), // which teammate
    usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),

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
    foreignKey({
      columns: [table.eventId, table.teamPathId, table.teamId],
      foreignColumns: [szTeamPath.eventId, szTeamPath.id, szTeamPath.teamId],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.usedBy],
      foreignColumns: [coreTeamMember.eventId, coreTeamMember.userId],
    }).onDelete("restrict"),
    index("sz_skip_team_path_idx").on(table.teamPathId),
  ],
);
