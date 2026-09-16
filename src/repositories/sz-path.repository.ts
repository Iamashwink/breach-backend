import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { coreSolve } from "@/models/core/solve";
import { szPath } from "@/models/event-specific/path";
import { szPathChallenge } from "@/models/event-specific/path-challenge";
import { szTeamPath } from "@/models/event-specific/team-path";

export async function findPathsByEvent(eventId: string, executor: Executor = db) {
  return executor
    .select()
    .from(szPath)
    .where(eq(szPath.eventId, eventId))
    .orderBy(asc(szPath.code));
}

export async function findPathById(pathId: string, eventId: string, executor: Executor = db) {
  const rows = await executor
    .select()
    .from(szPath)
    .where(and(eq(szPath.id, pathId), eq(szPath.eventId, eventId)));
  return rows[0] ?? null;
}

export async function findPathByCode(eventId: string, code: string) {
  const rows = await db
    .select()
    .from(szPath)
    .where(and(eq(szPath.eventId, eventId), eq(szPath.code, code)));
  return rows[0] ?? null;
}

/** The module's per-challenge story and ordering. Null for pathless challenges. */
export async function findPathChallenge(challengeId: string, executor: Executor = db) {
  const rows = await executor
    .select()
    .from(szPathChallenge)
    .where(eq(szPathChallenge.challengeId, challengeId));
  return rows[0] ?? null;
}

export async function findPathChallenges(pathId: string, executor: Executor = db) {
  return executor
    .select()
    .from(szPathChallenge)
    .where(eq(szPathChallenge.pathId, pathId))
    .orderBy(asc(szPathChallenge.sequence));
}

/** Challenge ids that belong to *some* path in this event — the rest are pathless. */
export async function findPathedChallengeIds(eventId: string, executor: Executor = db) {
  const rows = await executor
    .select({ challengeId: szPathChallenge.challengeId })
    .from(szPathChallenge)
    .where(eq(szPathChallenge.eventId, eventId));
  return rows.map((r) => r.challengeId);
}

export async function findActiveTeamPath(teamId: string, executor: Executor = db) {
  const rows = await executor
    .select()
    .from(szTeamPath)
    .where(and(eq(szTeamPath.teamId, teamId), eq(szTeamPath.isActive, true)));
  return rows[0] ?? null;
}

/**
 * The team's active attempt, locked for the rest of the caller's transaction.
 *
 * Skips read a quota count and then write; the lock on the shared attempt row
 * is what serialises two teammates skipping two *different* challenges, which
 * the `sz_skip` primary key on (team_id, challenge_id) does not cover.
 */
export async function lockActiveTeamPath(teamId: string, executor: Executor = db) {
  const rows = await executor
    .select()
    .from(szTeamPath)
    .where(and(eq(szTeamPath.teamId, teamId), eq(szTeamPath.isActive, true)))
    .for("update");
  return rows[0] ?? null;
}

export async function findTeamPaths(teamId: string, executor: Executor = db) {
  return executor.select().from(szTeamPath).where(eq(szTeamPath.teamId, teamId));
}

export async function createTeamPath(
  data: {
    eventId: string;
    teamId: string;
    pathId: string;
    entryReason: "initial" | "free_switch" | "penalized_switch";
    rewardMultiplier?: string;
  },
  executor: Executor = db,
) {
  const rows = await executor.insert(szTeamPath).values(data).returning();
  return rows[0]!;
}

export async function deactivateTeamPath(teamPathId: string, executor: Executor = db) {
  const rows = await executor
    .update(szTeamPath)
    .set({ isActive: false, leftAt: new Date() })
    .where(and(eq(szTeamPath.id, teamPathId), eq(szTeamPath.isActive, true)))
    .returning();
  return rows[0] ?? null;
}

/**
 * Records a skip against the attempt: drops the multiplier and bumps the
 * per-attempt counter.
 *
 * Both are written blind rather than read-then-write — the multiplier is
 * idempotent (0.80 set twice is still 0.80) and the counter increments in SQL,
 * so two concurrent skips can't both read the same value and lose one.
 */
export async function penaliseTeamPath(
  teamPathId: string,
  multiplier: string,
  executor: Executor = db,
) {
  const rows = await executor
    .update(szTeamPath)
    .set({ rewardMultiplier: multiplier, skipsUsed: sql`${szTeamPath.skipsUsed} + 1` })
    .where(eq(szTeamPath.id, teamPathId))
    .returning();
  return rows[0] ?? null;
}

/** Solves the team has banked on challenges belonging to one path. */
export async function countSolvesInPath(
  teamId: string,
  pathId: string,
  executor: Executor = db,
) {
  const rows = await executor
    .select({ count: count() })
    .from(coreSolve)
    .innerJoin(szPathChallenge, eq(szPathChallenge.challengeId, coreSolve.challengeId))
    .where(
      and(
        eq(coreSolve.teamId, teamId),
        eq(szPathChallenge.pathId, pathId),
        isNull(coreSolve.revokedAt),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

/** Challenge ids this team has solved, for reveal and prerequisite checks. */
export async function findSolvedChallengeIds(
  teamId: string,
  eventId: string,
  executor: Executor = db,
) {
  const rows = await executor
    .select({ challengeId: coreSolve.challengeId })
    .from(coreSolve)
    .where(
      and(
        eq(coreSolve.teamId, teamId),
        eq(coreSolve.eventId, eventId),
        isNull(coreSolve.revokedAt),
      ),
    );
  return rows.map((r) => r.challengeId);
}

/**
 * Points this team has banked, broken down by path code.
 *
 * Read from `core_solve` joined through `sz_path_challenge` rather than from
 * the team's current attempt, because points earned in a path the team has
 * since left still belong to that path — leaving an attempt closes it, it does
 * not un-earn its solves.
 *
 * Pathless challenges (welcome, convergence) carry no code and are returned
 * under the `null` key so the caller can add them to the total without
 * attributing them to A, B or C.
 */
export async function findTeamPathScores(
  teamId: string,
  eventId: string,
  executor: Executor = db,
) {
  const rows = await executor
    .select({
      code: szPath.code,
      points: sql<number>`coalesce(sum(${coreSolve.pointsAwarded}), 0)`,
      solves: count(coreSolve.challengeId),
    })
    .from(coreSolve)
    .leftJoin(szPathChallenge, eq(szPathChallenge.challengeId, coreSolve.challengeId))
    .leftJoin(szPath, eq(szPath.id, szPathChallenge.pathId))
    .where(
      and(
        eq(coreSolve.teamId, teamId),
        eq(coreSolve.eventId, eventId),
        isNull(coreSolve.revokedAt),
      ),
    )
    .groupBy(szPath.code);

  return rows.map((r) => ({
    code: r.code,
    points: Number(r.points),
    solves: Number(r.solves),
  }));
}
