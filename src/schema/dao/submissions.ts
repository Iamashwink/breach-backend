import { pgTable, uuid, text, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { teams } from "./teams";
import { profiles } from "./profiles";
import { eventChallenges } from "./event-challenges";

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id),
  userId: uuid("user_id").references(() => profiles.id),
  eventChallengeId: uuid("event_challenge_id").references(() => eventChallenges.id),
  submittedFlag: text("submitted_flag"),
  correct: boolean("correct"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const teamSolves = pgTable("team_solves", {
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  eventChallengeId: uuid("event_challenge_id").references(() => eventChallenges.id).notNull(),
  solvedBy: uuid("solved_by").references(() => profiles.id),
  pointsAwarded: integer("points_awarded"),
  solvedAt: timestamp("solved_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.teamId, t.eventChallengeId] }),
]);
