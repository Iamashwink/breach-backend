import { db } from "@/db/client";
import { isUniqueViolation } from "@/errors/db-errors";
import { ConflictError, NotFoundError, ValidationError } from "@/errors/error-types";
import { findChallengesByEvent } from "@/repositories/challenge.repository";
import { findFragmentsByTeam } from "@/repositories/sz-fragment.repository";
import {
  countSolvesInPath,
  createTeamPath,
  deactivateTeamPath,
  findActiveTeamPath,
  findPathById,
  findPathChallenges,
  findPathedChallengeIds,
  findPathsByEvent,
  findSolvedChallengeIds,
  findTeamPaths,
} from "@/repositories/sz-path.repository";
import { findPrereqsByEvent } from "@/repositories/sz-reveal.repository";
import { findSkippedChallengeIds } from "@/repositories/sz-skip.repository";
import { ensureCanScore } from "@/services/events/event-guard";
import {
  FREE_SWITCH_THRESHOLD,
  FULL_MULTIPLIER,
  PENALTY_MULTIPLIER,
} from "@/services/signal-zero/config";
import { syncUnlocks } from "@/services/signal-zero/reveal.service";

/**
 * Checks whether a team has completed a given path:
 * 1. Path final fragment challenge is solved, OR
 * 2. Fragment delivered by this path is held, OR
 * 3. All challenges on this path are solved or skipped.
 */
export async function isPathCompleted(
  teamId: string,
  eventId: string,
  pathId: string,
): Promise<boolean> {
  const pathChallenges = await findPathChallenges(pathId);
  if (pathChallenges.length === 0) return false;

  const [solvedIds, skippedIds, fragments, targetPath] = await Promise.all([
    findSolvedChallengeIds(teamId, eventId),
    findSkippedChallengeIds(teamId, eventId),
    findFragmentsByTeam(teamId, eventId),
    findPathById(pathId, eventId),
  ]);

  const solvedSet = new Set(solvedIds);
  const skippedSet = new Set(skippedIds);

  const finalChallenge = pathChallenges.find((pc) => pc.isPathFinal);
  if (finalChallenge && solvedSet.has(finalChallenge.challengeId)) {
    return true;
  }

  if (targetPath && fragments.some((f) => f.fragmentKey === targetPath.delivers)) {
    return true;
  }

  const allClosed = pathChallenges.every(
    (pc) => solvedSet.has(pc.challengeId) || skippedSet.has(pc.challengeId),
  );
  return allClosed;
}

/**
 * The welcome challenge: the one visible challenge that belongs to no path and
 * has no prerequisites. Identified structurally rather than by a flag column,
 * which is what keeps "welcome" a content decision instead of a schema one.
 *
 * "The first match" is only meaningful because `findChallengesByEvent` orders
 * its rows — without that, two calls in one request could disagree about which
 * challenge gates path selection. Hidden challenges are excluded for the same
 * reason: an unsolvable gate is a locked event.
 */
async function findWelcomeChallenge(eventId: string) {
  const [challenges, pathedIds, prereqs] = await Promise.all([
    findChallengesByEvent(eventId),
    findPathedChallengeIds(eventId),
    findPrereqsByEvent(eventId),
  ]);

  const pathed = new Set(pathedIds);
  const gated = new Set(prereqs.map((p) => p.challengeId));

  return (
    challenges.find(
      (c) => c.state === "visible" && !pathed.has(c.id) && !gated.has(c.id),
    ) ?? null
  );
}

export async function listPaths(userId: string, eventId: string) {
  const paths = await findPathsByEvent(eventId);
  if (paths.length === 0) throw new NotFoundError("This event has no paths");

  const { teamId } = await ensureCanScore(userId, eventId, "view paths");
  const attempts = await findTeamPaths(teamId);
  const byPathId = new Map(attempts.map((a) => [a.pathId, a]));

  const welcome = await findWelcomeChallenge(eventId);
  const solvedIds = await findSolvedChallengeIds(teamId, eventId);
  const welcomeSolved = welcome ? solvedIds.includes(welcome.id) : true;

  const activeAttempt = attempts.find((a) => a.isActive);
  const activeCompleted = activeAttempt
    ? await isPathCompleted(teamId, eventId, activeAttempt.pathId)
    : false;

  const pathCompletionStatuses = await Promise.all(
    paths.map((p) =>
      byPathId.has(p.id) ? isPathCompleted(teamId, eventId, p.id) : Promise.resolve(false),
    ),
  );

  return {
    welcomeSolved,
    canSelect: welcomeSolved && !attempts.some((a) => a.isActive),
    paths: paths.map((path, idx) => {
      const attempt = byPathId.get(path.id);
      const isAttempted = !!attempt;
      const isCompleted = pathCompletionStatuses[idx] ?? false;
      const isUnattempted = !attempt;
      // Locked if team is on an active path that has not been completed yet
      const isLocked = isUnattempted && !!activeAttempt && !activeCompleted;
      const canSwitchFree = isUnattempted && (!activeAttempt || activeCompleted);

      return {
        id: path.id,
        code: path.code,
        name: path.name,
        delivers: path.delivers,
        introNarration: path.introNarration,
        isActive: attempt?.isActive ?? false,
        isAttempted,
        isAvailable: !attempt,
        isCompleted,
        isLocked,
        canSwitchFree,
        rewardMultiplier: attempt?.rewardMultiplier ?? null,
      };
    }),
  };
}

export async function selectPath(userId: string, eventId: string, pathId: string) {
  const { teamId } = await ensureCanScore(userId, eventId, "select a path");

  const path = await findPathById(pathId, eventId);
  if (!path) throw new NotFoundError("Path not found");

  const active = await findActiveTeamPath(teamId);
  if (active) throw new ConflictError("Your team is already on a path — switch instead");

  const welcome = await findWelcomeChallenge(eventId);
  if (welcome) {
    const solvedIds = await findSolvedChallengeIds(teamId, eventId);
    if (!solvedIds.includes(welcome.id))
      throw new ValidationError("Solve the welcome challenge before choosing a path");
  }

  const attempted = await findTeamPaths(teamId);
  if (attempted.some((a) => a.pathId === pathId))
    throw new ConflictError("Your team has already run this path");

  try {
    const attempt = await db.transaction(async (tx) => {
      const created = await createTeamPath(
        { eventId, teamId, pathId, entryReason: "initial" },
        tx,
      );
      await syncUnlocks(teamId, eventId, "initial", tx);
      return created;
    });

    return { path, attempt };
  } catch (error) {
    if (isUniqueViolation(error, "sz_one_active_path"))
      throw new ConflictError("Your team is already on a path — switch instead");
    if (isUniqueViolation(error))
      throw new ConflictError("Your team has already run this path");
    throw error;
  }
}

/**
 * Switching paths.
 * Completing the active path (or achieving 8+ solves) grants a 100% free switch
 * with 0 points deducted and full (1.00x) rewards on the new path.
 *
 * Switching early in-between before path completion costs the team:
 * rewards on the new path will be 80% (PENALTY_MULTIPLIER).
 *
 * All challenges on previously entered paths remain available to solve.
 */
export async function switchPath(userId: string, eventId: string, pathId: string) {
  const { teamId } = await ensureCanScore(userId, eventId, "switch paths");

  const target = await findPathById(pathId, eventId);
  if (!target) throw new NotFoundError("Path not found");

  const active = await findActiveTeamPath(teamId);
  if (!active) throw new ValidationError("Your team is not on a path yet");
  if (active.pathId === pathId) throw new ValidationError("You are already on this path");

  const attempted = await findTeamPaths(teamId);
  if (attempted.some((a) => a.pathId === pathId))
    throw new ConflictError("Your team has already run this path");

  const [solvesInPath, isCompleted] = await Promise.all([
    countSolvesInPath(teamId, active.pathId),
    isPathCompleted(teamId, eventId, active.pathId),
  ]);

  const isFree = isCompleted || solvesInPath >= FREE_SWITCH_THRESHOLD;

  const attempt = await db.transaction(async (tx) => {
    const closed = await deactivateTeamPath(active.id, tx);
    if (!closed) throw new ConflictError("Path switch already in progress");

    const created = await createTeamPath(
      {
        eventId,
        teamId,
        pathId,
        entryReason: isFree ? "free_switch" : "penalized_switch",
        rewardMultiplier: isFree ? FULL_MULTIPLIER : PENALTY_MULTIPLIER,
      },
      tx,
    );
    await syncUnlocks(teamId, eventId, "initial", tx);
    return created;
  });

  return {
    path: target,
    attempt,
    free: isFree,
    solvesInPreviousPath: solvesInPath,
    message: isFree
      ? "Path completed! Free switch — full 100% rewards on the new path (0 points deducted)"
      : `Switched in-between before completing path (${solvesInPath} solves) — 80% rewards on the new path`,
  };
}
