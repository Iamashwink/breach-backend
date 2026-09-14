import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { coreSubmission } from "@/models/core/submission";
import { coreSolve } from "@/models/core/solve";

export async function countIncorrectAttempts(teamId: string, challengeId: string) {
  const rows = await db
    .select({ count: count() })
    .from(coreSubmission)
    .where(
      and(
        eq(coreSubmission.teamId, teamId),
        eq(coreSubmission.challengeId, challengeId),
        eq(coreSubmission.verdict, "incorrect"),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

export async function findSolveByTeamAndChallenge(teamId: string, challengeId: string) {
  const rows = await db
    .select()
    .from(coreSolve)
    .where(and(eq(coreSolve.teamId, teamId), eq(coreSolve.challengeId, challengeId)));
  return rows[0] ?? null;
}

export async function getChallengeSolveCount(challengeId: string) {
  const rows = await db
    .select({ count: count() })
    .from(coreSolve)
    .where(and(eq(coreSolve.challengeId, challengeId), sql`${coreSolve.revokedAt} IS NULL`));
  return Number(rows[0]?.count ?? 0);
}

export async function getNextSolveOrder(challengeId: string) {
  const rows = await db
    .select({ count: count() })
    .from(coreSolve)
    .where(and(eq(coreSolve.challengeId, challengeId), sql`${coreSolve.revokedAt} IS NULL`));
  return Number(rows[0]?.count ?? 0) + 1;
}

export async function createSubmission(data: {
  eventId: string;
  teamId: string;
  submittedBy: string;
  challengeId: string;
  rawInput: string;
  verdict: "correct" | "incorrect" | "duplicate" | "rate_limited";
}) {
  const rows = await db.insert(coreSubmission).values(data).returning();
  return rows[0]!;
}

export async function createSolve(data: {
  teamId: string;
  challengeId: string;
  eventId: string;
  solvedBy: string;
  submissionId: bigint;
  basePoints: number;
  pointsAwarded: number;
  solveOrder: number;
}) {
  const rows = await db.insert(coreSolve).values(data).returning();
  return rows[0]!;
}
