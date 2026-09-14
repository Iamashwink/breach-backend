import { bigint, check, foreignKey, index, integer, numeric, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "@/models/shared/timestamp_audit";
import { coreChallenge } from "@/models/core/challenge";
import { coreEvent } from "@/models/core/event";
import { coreTeam } from "@/models/core/team";
import { coreSubmission } from "@/models/core/submission";
import { coreTeamMember } from "@/models/core/team-member";
import { coreUser } from "@/models/core/user";

/**
 * A scoring solve. Points are snapshotted at solve time, so later changes to
 * the challenge's scoring never retroactively move the board.
 *
 * Revocation (a bad flag, a confirmed cheat) sets `revokedAt` rather than
 * deleting the row: the board must stop counting it while the record of what
 * happened, and who reversed it, survives. This is the one place the schema
 * needs a reversible "delete", and it is modelled explicitly instead of via a
 * blanket `is_deleted` column.
 */
export const coreSolve = pgTable(
  "core_solve",
  {
    teamId: uuid("team_id").notNull(),
    challengeId: uuid("challenge_id").notNull(),
    eventId: uuid("event_id").notNull(),
    solvedBy: uuid("solved_by"), // which teammate
    submissionId: bigint("submission_id", { mode: "bigint" }),
    basePoints: integer("base_points").notNull(), // what the challenge was worth at that instant
    multiplier: numeric("multiplier", { precision: 4, scale: 2 }).notNull().default("1.00"), // module penalty
    pointsAwarded: integer("points_awarded").notNull(), // ROUND(base * multiplier)
    solveOrder: integer("solve_order"), // 1 = first blood
    solvedAt: timestamp("solved_at", { withTimezone: true }).notNull().defaultNow(),

    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => coreUser.id, { onDelete: "set null" }),
    revokedReason: text("revoked_reason"),

    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.challengeId] }),
    check("core_solve_base_points_check", sql`${table.basePoints} > 0`),
    check("core_solve_multiplier_check", sql`${table.multiplier} >= 0`),
    check("core_solve_points_awarded_check", sql`${table.pointsAwarded} >= 0`),
    check("core_solve_order_check", sql`${table.solveOrder} IS NULL OR ${table.solveOrder} > 0`),
    check(
      "core_solve_revoked_reason_check",
      sql`${table.revokedAt} IS NULL OR ${table.revokedReason} IS NOT NULL`,
    ),
    index("core_solve_challenge_solved_at_idx").on(table.challengeId, table.solvedAt),
    index("core_solve_team_idx").on(table.teamId),
    index("core_solve_event_solved_at_idx").on(table.eventId, table.solvedAt),
    foreignKey({ columns: [table.eventId], foreignColumns: [coreEvent.id] }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.teamId],
      foreignColumns: [coreTeam.eventId, coreTeam.id],
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.eventId, table.challengeId],
      foreignColumns: [coreChallenge.eventId, coreChallenge.id],
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.eventId, table.submissionId],
      foreignColumns: [coreSubmission.eventId, coreSubmission.id],
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.eventId, table.solvedBy],
      foreignColumns: [coreTeamMember.eventId, coreTeamMember.userId],
    }).onDelete("restrict"),
    unique().on(table.submissionId),
    // First blood is a single seat. Without this two rows could both claim 1.
    unique("core_solve_challenge_order_uq").on(table.challengeId, table.solveOrder),
  ],
);
