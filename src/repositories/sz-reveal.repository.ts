import { and, eq } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { szChallengePrereq } from "@/models/event-specific/challenge-prereq";
import { szUnlockedChallenge } from "@/models/event-specific/unlocked-challenge";
import type { SzUnlockSource } from "@/models/event-specific/custom-types";

export async function findUnlockedChallengeIds(
  teamId: string,
  eventId: string,
  executor: Executor = db,
) {
  const rows = await executor
    .select({ challengeId: szUnlockedChallenge.challengeId })
    .from(szUnlockedChallenge)
    .where(
      and(eq(szUnlockedChallenge.teamId, teamId), eq(szUnlockedChallenge.eventId, eventId)),
    );
  return rows.map((r) => r.challengeId);
}

export async function isChallengeUnlocked(
  teamId: string,
  challengeId: string,
  executor: Executor = db,
) {
  const rows = await executor
    .select({ challengeId: szUnlockedChallenge.challengeId })
    .from(szUnlockedChallenge)
    .where(
      and(
        eq(szUnlockedChallenge.teamId, teamId),
        eq(szUnlockedChallenge.challengeId, challengeId),
      ),
    );
  return rows.length > 0;
}

/**
 * Idempotent by the table's (team_id, challenge_id) primary key, which is what
 * lets the reveal engine recompute and re-insert the whole window after every
 * solve instead of tracking deltas.
 */
export async function insertUnlocks(
  rows: { eventId: string; teamId: string; challengeId: string; source: SzUnlockSource }[],
  executor: Executor = db,
) {
  if (rows.length === 0) return [];
  return executor.insert(szUnlockedChallenge).values(rows).onConflictDoNothing().returning();
}

/** The whole prerequisite DAG for one event — small enough to resolve in memory. */
export async function findPrereqsByEvent(eventId: string, executor: Executor = db) {
  return executor
    .select({
      challengeId: szChallengePrereq.challengeId,
      requiresId: szChallengePrereq.requiresId,
    })
    .from(szChallengePrereq)
    .where(eq(szChallengePrereq.eventId, eventId));
}
