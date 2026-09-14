import { bigserial, foreignKey, index, inet, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { submissionVerdict } from "@/models/core/custom-types";
import { coreChallenge } from "@/models/core/challenge";
import { coreEvent } from "@/models/core/event";
import { coreTeam } from "@/models/core/team";
import { coreTeamMember } from "@/models/core/team-member";

/**
 * Append-only audit log — every attempt, right or wrong. Never updated, never
 * deleted; it is the anti-cheat and dispute-resolution record.
 *
 * Because it is append-only it carries neither `updatedAt` nor any deletion
 * state — `submittedAt` is the only timestamp that means anything here.
 *
 * NOTE: `rawInput` holds correct flags in plaintext, so read access to this
 * table is equivalent to read access to every flag. Hashing `flag_hash` buys
 * nothing against an attacker who can read here; treat this table as secret
 * and keep it out of any admin export that isn't itself privileged.
 */
export const coreSubmission = pgTable(
  "core_submission",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    eventId: uuid("event_id").notNull(),
    teamId: uuid("team_id").notNull(),
    submittedBy: uuid("submitted_by"), // which teammate
    challengeId: uuid("challenge_id").notNull(),
    rawInput: text("raw_input").notNull(),
    verdict: submissionVerdict("verdict").notNull(),
    ipAddress: inet("ip_address"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("core_submission_team_challenge_idx").on(table.teamId, table.challengeId),
    index("core_submission_challenge_verdict_idx").on(table.challengeId, table.verdict),
    index("core_submission_event_submitted_at_idx").on(table.eventId, table.submittedAt),
    // Rate limiting reads "attempts by this team on this challenge since T".
    index("core_submission_rate_limit_idx").on(table.teamId, table.submittedAt),
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
      columns: [table.eventId, table.submittedBy],
      foreignColumns: [coreTeamMember.eventId, coreTeamMember.userId],
    }).onDelete("restrict"),
    unique().on(table.id, table.eventId), // composite-FK target
  ],
);
