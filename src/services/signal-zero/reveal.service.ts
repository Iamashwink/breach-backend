import { db, type Executor } from "@/db/client";
import type { SzUnlockSource } from "@/models/event-specific/custom-types";
import { findChallengesByEvent } from "@/repositories/challenge.repository";
import {
  findActiveTeamPath,
  findPathChallenges,
  findPathedChallengeIds,
  findPathsByEvent,
  findSolvedChallengeIds,
} from "@/repositories/sz-path.repository";
import { findSkippedChallengeIds } from "@/repositories/sz-skip.repository";
import {
  findPrereqsByEvent,
  findUnlockedChallengeIds,
  insertUnlocks,
} from "@/repositories/sz-reveal.repository";

/**
 * The Signal Zero reveal rule, as stated in the rules doc:
 *
 *   "In each path 2 challenges are revealed initially. Completion of challenge
 *    1 or 2 reveals two new challenges 3 and 4. Then after each challenge
 *    completion reveals a new challenge, always exposing 3 challenges."
 *
 * Expressed as a target count of unlocked challenges given how many the team
 * has *closed* (solved or skipped — a skip advances the window too):
 *
 *   closed 0 -> 2 unlocked, 2 exposed
 *   closed 1 -> 4 unlocked, 3 exposed
 *   closed n -> n + 3 unlocked, 3 exposed
 *
 * Written as a target rather than "unlock one more per solve" so the function
 * is idempotent: recomputing it can only ever add the rows a correct history
 * would already have produced. That matters because it is re-run after every
 * solve and skip, and because a prerequisite-gated challenge (A10) may be
 * passed over on one pass and become eligible several solves later.
 */
export function targetUnlockCount(closed: number): number {
  return closed === 0 ? 2 : closed + 3;
}

/**
 * Recomputes and materialises everything this team should currently see.
 * Idempotent — safe to call after any state change, and cheap enough to.
 */
export async function syncUnlocks(
  teamId: string,
  eventId: string,
  source: SzUnlockSource = "solve",
  executor: Executor = db,
) {
  // An event with no paths is a plain CTF: the module never engages and every
  // visible challenge is open by default, so there is no reveal state to keep.
  //
  // Every read below goes through `executor`, never `db`. When this runs inside
  // a caller's transaction, using the pool instead would check out a second
  // connection while the first is still held — enough concurrent solves and
  // every connection in the pool is waiting for one that will never free up.
  const paths = await findPathsByEvent(eventId, executor);
  if (paths.length === 0) return [];

  const [challenges, pathedIds, prereqs, unlockedIds, solvedIds, skippedIds, activePath] =
    await Promise.all([
      findChallengesByEvent(eventId, executor),
      findPathedChallengeIds(eventId, executor),
      findPrereqsByEvent(eventId, executor),
      findUnlockedChallengeIds(teamId, eventId, executor),
      findSolvedChallengeIds(teamId, eventId, executor),
      findSkippedChallengeIds(teamId, eventId, executor),
      findActiveTeamPath(teamId, executor),
    ]);

  const pathed = new Set(pathedIds);
  const unlocked = new Set(unlockedIds);
  const solved = new Set(solvedIds);
  const closedSet = new Set([...solvedIds, ...skippedIds]);

  // challengeId -> ids it requires
  const requires = new Map<string, string[]>();
  for (const { challengeId, requiresId } of prereqs) {
    const list = requires.get(challengeId) ?? [];
    list.push(requiresId);
    requires.set(challengeId, list);
  }
  const prereqsSatisfied = (challengeId: string) =>
    (requires.get(challengeId) ?? []).every((id) => solved.has(id));

  const pending: {
    eventId: string;
    teamId: string;
    challengeId: string;
    source: SzUnlockSource;
  }[] = [];
  const add = (challengeId: string, unlockSource: SzUnlockSource) => {
    pending.push({ eventId, teamId, challengeId, source: unlockSource });
    unlocked.add(challengeId);
  };

  // 1. Pathless challenges — the welcome challenge (no prerequisites, so open
  //    immediately) and the convergence final (gated on WHO + HOW + WHY).
  //    Keeping these out of sz_path_challenge is what lets them exist as
  //    ordinary core challenges with no special flag on the core table.
  for (const challenge of challenges) {
    if (pathed.has(challenge.id)) continue;
    if (challenge.state !== "visible") continue;
    if (unlocked.has(challenge.id)) continue;
    if (!prereqsSatisfied(challenge.id)) continue;
    add(challenge.id, requires.has(challenge.id) ? "prereq" : "initial");
  }

  // 2. The active path's sliding window.
  if (activePath) {
    const pathChallenges = await findPathChallenges(activePath.pathId, executor);

    const closed = pathChallenges.filter((pc) => closedSet.has(pc.challengeId)).length;
    const target = targetUnlockCount(closed);
    let unlockedInPath = pathChallenges.filter((pc) => unlocked.has(pc.challengeId)).length;

    const firstReveal = unlockedInPath === 0;

    for (const pc of pathChallenges) {
      if (unlockedInPath >= target) break;
      if (unlocked.has(pc.challengeId)) continue;
      // A gated challenge is passed over rather than blocking the window —
      // it enters on a later pass, once its prerequisites are solved.
      if (!prereqsSatisfied(pc.challengeId)) continue;

      add(pc.challengeId, firstReveal ? "initial" : requires.has(pc.challengeId) ? "prereq" : source);
      unlockedInPath += 1;
    }
  }

  await insertUnlocks(pending, executor);
  return pending.map((p) => p.challengeId);
}
