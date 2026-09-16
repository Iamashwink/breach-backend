import { and, count, eq, sql } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { coreSubmission } from "@/models/core/submission";
import { coreSolve } from "@/models/core/solve";

export async function countIncorrectAttempts(
  teamId: string,
  challengeId: string,
  executor: Executor = db,
) {
  const rows = await executor
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

export async function findSolveByTeamAndChallenge(
  teamId: string,
  challengeId: string,
  executor: Executor = db,
) {
  const rows = await executor
    .select()
    .from(coreSolve)
    .where(and(eq(coreSolve.teamId, teamId), eq(coreSolve.challengeId, challengeId)));
  return rows[0] ?? null;
}

/**
 * Solves that currently count — the basis for dynamic scoring. Revoked solves
 * are excluded because a reversed solve should not keep pushing the price down.
 */
export async function getChallengeSolveCount(challengeId: string, executor: Executor = db) {
  const rows = await executor
    .select({ count: count() })
    .from(coreSolve)
    .where(and(eq(coreSolve.challengeId, challengeId), sql`${coreSolve.revokedAt} IS NULL`));
  return Number(rows[0]?.count ?? 0);
}

/**
 * The next free `solve_order` for this challenge.
 *
 * Counts *every* row, revoked included, because the uniqueness it has to
 * satisfy — `core_solve_challenge_order_uq` on (challenge_id, solve_order) —
 * also counts every row. Excluding revoked solves here would hand out an order
 * number a revoked row still holds, and the INSERT would fail.
 *
 * Call this inside the transaction, after `lockChallengeForUpdate`; on its own
 * it is a read that two concurrent solvers can both win.
 */
export async function getNextSolveOrder(challengeId: string, executor: Executor = db) {
  const rows = await executor
    .select({ count: count() })
    .from(coreSolve)
    .where(eq(coreSolve.challengeId, challengeId));
  return Number(rows[0]?.count ?? 0) + 1;
}

export async function createSubmission(
  data: {
    eventId: string;
    teamId: string;
    submittedBy: string;
    challengeId: string;
    rawInput: string;
    verdict: "correct" | "incorrect" | "duplicate" | "rate_limited";
  },
  executor: Executor = db,
) {
  const rows = await executor.insert(coreSubmission).values(data).returning();
  return rows[0]!;
}

export async function createSolve(
  data: {
    teamId: string;
    challengeId: string;
    eventId: string;
    solvedBy: string;
    submissionId: bigint;
    basePoints: number;
    multiplier: string;
    pointsAwarded: number;
    solveOrder: number;
  },
  executor: Executor = db,
) {
  const rows = await executor.insert(coreSolve).values(data).returning();
  return rows[0]!;
}
