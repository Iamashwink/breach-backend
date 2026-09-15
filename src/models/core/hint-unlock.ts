import { foreignKey, index, integer, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "@/models/shared/timestamp_audit";
import { coreHint } from "@/models/core/hint";
import { coreTeam } from "@/models/core/team";
import { coreEvent } from "@/models/core/event";
import { coreTeamMember } from "@/models/core/team-member";

export const coreHintUnlock = pgTable(
  "core_hint_unlock",
  {
    teamId: uuid("team_id").notNull(),
    hintId: uuid("hint_id").notNull(),
    eventId: uuid("event_id").notNull(),
    costPaid: integer("cost_paid").notNull(), // snapshot; hint.cost may change later
    unlockedBy: uuid("unlocked_by"), // which teammate
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),

    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.hintId] }),
    foreignKey({ columns: [table.eventId], foreignColumns: [coreEvent.id] }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.teamId],
      foreignColumns: [coreTeam.eventId, coreTeam.id],
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.eventId, table.hintId],
      foreignColumns: [coreHint.eventId, coreHint.id],
    }).onDelete("restrict"),
    // The actor must be a team member in this event. RESTRICT is deliberate:
    // someone who has spent the team's points cannot be quietly unlinked.
    foreignKey({
      columns: [table.eventId, table.unlockedBy],
      foreignColumns: [coreTeamMember.eventId, coreTeamMember.userId],
    }).onDelete("restrict"),
    index("core_hint_unlock_event_team_idx").on(table.eventId, table.teamId),
  ],
);
