import { foreignKey, index, pgTable, primaryKey, uniqueIndex, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "@/models/shared/timestamp_audit";
import { teamRole } from "@/models/core/custom-types";
import { coreTeam } from "@/models/core/team";
import { coreUser } from "@/models/core/user";
import { coreEventUser } from "@/models/core/event-user";

/**
 * The single source of truth for "who is on which team". Everything that needs
 * to attribute an action to a teammate (`core_solve.solvedBy`,
 * `core_submission.submittedBy`, ...) foreign-keys into the
 * `(eventId, userId)` unique below, so an actor is always a registered,
 * team-affiliated user in that event.
 *
 * There is no materialised copy of this table — the old
 * `core_participant_member` duplicated it with nothing keeping the two in sync.
 */
export const coreTeamMember = pgTable(
  "core_team_member",
  {
    teamId: uuid("team_id").notNull(),
    eventId: uuid("event_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: teamRole("role").notNull().default("member"),

    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.userId] }),
    foreignKey({
      columns: [table.teamId, table.eventId],
      foreignColumns: [coreTeam.id, coreTeam.eventId],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.userId],
      foreignColumns: [coreEventUser.eventId, coreEventUser.userId],
    }).onDelete("cascade"),
    foreignKey({ columns: [table.userId], foreignColumns: [coreUser.id] }).onDelete("cascade"),
    // A user joins at most one team per event. Also the FK target used by
    // every `*_by` teammate-attribution column.
    unique("core_team_member_event_user_uq").on(table.eventId, table.userId),
    // Exactly one captain per team.
    uniqueIndex("core_team_one_captain")
      .on(table.teamId)
      .where(sql`${table.role} = 'captain'`),
    index("core_team_member_user_idx").on(table.userId),
  ],
);
