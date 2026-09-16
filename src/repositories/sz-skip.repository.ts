import { and, count, eq } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { szSkip } from "@/models/event-specific/skip";

/**
 * Event-wide skip usage. The counter on sz_team_path is per-attempt; the quota
 * the rules doc specifies is per-team for the whole event, so it is counted
 * from the skip rows themselves and survives a path switch.
 */
export async function countSkipsByTeam(teamId: string, eventId: string, executor: Executor = db) {
  const rows = await executor
    .select({ count: count() })
    .from(szSkip)
    .where(and(eq(szSkip.teamId, teamId), eq(szSkip.eventId, eventId)));
  return Number(rows[0]?.count ?? 0);
}

export async function findSkippedChallengeIds(
  teamId: string,
  eventId: string,
  executor: Executor = db,
) {
  const rows = await executor
    .select({ challengeId: szSkip.challengeId })
    .from(szSkip)
    .where(and(eq(szSkip.teamId, teamId), eq(szSkip.eventId, eventId)));
  return rows.map((r) => r.challengeId);
}

export async function createSkip(
  data: {
    eventId: string;
    teamId: string;
    challengeId: string;
    teamPathId: string;
    usedBy: string;
  },
  executor: Executor = db,
) {
  const rows = await executor.insert(szSkip).values(data).returning();
  return rows[0]!;
}
