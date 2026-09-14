import { pgEnum } from "drizzle-orm/pg-core";

export const challengeDifficulty = pgEnum("challenge_difficulty", [
  "easy",
  "medium",
  "hard",
  "expert",
]);
export type ChallengeDifficulty = (typeof challengeDifficulty.enumValues)[number];

export const challengeState = pgEnum("challenge_state", ["hidden", "visible", "locked"]);
export type ChallengeState = (typeof challengeState.enumValues)[number];

export const decayType = pgEnum("decay_type", ["logarithmic", "linear", "static"]);
export type DecayType = (typeof decayType.enumValues)[number];

export const submissionVerdict = pgEnum("submission_verdict", [
  "correct",
  "incorrect",
  "duplicate",
  "rate_limited",
]);
export type SubmissionVerdict = (typeof submissionVerdict.enumValues)[number];

export const teamRole = pgEnum("team_role", ["captain", "member"]);
export type TeamRole = (typeof teamRole.enumValues)[number];
