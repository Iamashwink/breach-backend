import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { coreLeaderboard } from "@/models/core/views";
import { coreHintUnlock } from "@/models/core/hint-unlock";
import { coreSolve } from "@/models/core/solve";
import { coreTeam } from "@/models/core/team";

export async function getLiveLeaderboard(eventId: string) {
  return db
    .select()
    .from(coreLeaderboard)
    .where(eq(coreLeaderboard.eventId, eventId))
    .orderBy(coreLeaderboard.rank);
}

export async function getFrozenLeaderboard(eventId: string, frozenAt: Date) {
  const solves = db
    .select({
      teamId: coreSolve.teamId,
      total: sql<number>`sum(${coreSolve.pointsAwarded})`.as("total"),
      solveCount: sql<number>`count(*)`.as("solve_count"),
      lastSolveAt: sql<Date>`max(${coreSolve.solvedAt})`.as("last_solve_at"),
    })
    .from(coreSolve)
    .where(
      and(
        eq(coreSolve.eventId, eventId),
        lte(coreSolve.solvedAt, frozenAt),
        sql`${coreSolve.revokedAt} IS NULL`,
      ),
    )
    .groupBy(coreSolve.teamId)
    .as("sv");

  const hints = db
    .select({
      teamId: coreHintUnlock.teamId,
      spent: sql<number>`sum(${coreHintUnlock.costPaid})`.as("spent"),
    })
    .from(coreHintUnlock)
    .where(
      and(
        eq(coreHintUnlock.eventId, eventId),
        lte(coreHintUnlock.unlockedAt, frozenAt),
      ),
    )
    .groupBy(coreHintUnlock.teamId)
    .as("h");

  const rows = await db
    .select({
      teamId: coreTeam.id,
      displayName: coreTeam.name,
      isSolo: coreTeam.isSolo,
      score: sql<number>`coalesce(${solves.total}, 0) - coalesce(${hints.spent}, 0)`,
      solveCount: sql<number>`coalesce(${solves.solveCount}, 0)`,
      lastSolveAt: solves.lastSolveAt,
    })
    .from(coreTeam)
    .leftJoin(solves, eq(solves.teamId, coreTeam.id))
    .leftJoin(hints, eq(hints.teamId, coreTeam.id))
    .where(
      and(
        eq(coreTeam.eventId, eventId),
        sql`${coreTeam.isHidden} = FALSE`,
        sql`${coreTeam.disqualifiedAt} IS NULL`,
      ),
    )
    .orderBy(
      sql`coalesce(${solves.total}, 0) - coalesce(${hints.spent}, 0) DESC`,
      // Ties break on the earliest last-solve, read from the subquery. Calling
      // max() here instead would be an aggregate in a non-grouped query.
      sql`${solves.lastSolveAt} ASC NULLS LAST`,
    );

  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * One team's row from the live board — score, solve count and rank.
 *
 * Read from the same view the scoreboard uses so the number in the player's
 * HUD and the number next to their name on the board can never disagree. The
 * view already nets hint spend out of the score, so callers must not subtract
 * it a second time.
 *
 * Returns null for a hidden or disqualified team: the view excludes them, and
 * a HUD that quietly showed a stale score would be worse than an absent one.
 */
export async function getTeamStanding(eventId: string, teamId: string) {
  const rows = await db
    .select()
    .from(coreLeaderboard)
    .where(and(eq(coreLeaderboard.eventId, eventId), eq(coreLeaderboard.teamId, teamId)));

  const row = rows[0];
  if (!row) return null;
  return {
    score: Number(row.score ?? 0),
    solveCount: Number(row.solveCount ?? 0),
    rank: Number(row.rank ?? 0),
    lastSolveAt: row.lastSolveAt,
  };
}
