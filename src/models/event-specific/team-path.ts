import { boolean, check, foreignKey, index, numeric, pgTable, smallint, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "@/models/shared/timestamp_audit";
import { szPathEntryReason } from "@/models/event-specific/custom-types";
import { coreTeam } from "@/models/core/team";
import { coreEvent } from "@/models/core/event";
import { szPath } from "@/models/event-specific/path";

/**
 * A team's run down one path.
 *
 * The CHECK constraints here only assert sanity (a multiplier is a fraction, a
 * counter is non-negative). The actual allowances — "a penalised switch costs
 * 20%", "you get four skips" — are event config, not schema: baking 0.80 and 4
 * into constraints meant a migration to retune the game mid-event.
 */
export const szTeamPath = pgTable(
  "sz_team_path",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull(),
    teamId: uuid("team_id").notNull(),
    pathId: uuid("path_id").notNull(),
    entryReason: szPathEntryReason("entry_reason").notNull().default("initial"),
    rewardMultiplier: numeric("reward_multiplier", { precision: 4, scale: 2 }).notNull().default("1.00"),
    skipsUsed: smallint("skips_used").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    enteredAt: timestamp("entered_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),

    ...timestamps,
  },
  (table) => [
    check(
      "sz_team_path_multiplier_check",
      sql`${table.rewardMultiplier} > 0 AND ${table.rewardMultiplier} <= 1`,
    ),
    check("sz_team_path_skips_used_check", sql`${table.skipsUsed} >= 0`),
    // Active means still running; inactive means it ended. Both directions.
    check(
      "sz_team_path_active_state_check",
      sql`${table.isActive} = (${table.leftAt} IS NULL)`,
    ),
    check(
      "sz_team_path_left_after_entered_check",
      sql`${table.leftAt} IS NULL OR ${table.leftAt} >= ${table.enteredAt}`,
    ),
    foreignKey({ columns: [table.eventId], foreignColumns: [coreEvent.id] }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.teamId],
      foreignColumns: [coreTeam.eventId, coreTeam.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.pathId],
      foreignColumns: [szPath.eventId, szPath.id],
    }).onDelete("cascade"),
    unique().on(table.id, table.eventId, table.teamId), // composite-FK target
    // No re-entering an abandoned path to farm it a second time.
    unique().on(table.teamId, table.pathId),
    uniqueIndex("sz_one_active_path")
      .on(table.teamId)
      .where(sql`${table.isActive}`),
    index("sz_team_path_event_path_idx").on(table.eventId, table.pathId),
  ],
);
