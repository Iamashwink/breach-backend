import { db } from "@/db/client";
import { isUniqueViolation } from "@/errors/db-errors";
import { ConflictError, NotFoundError, ValidationError } from "@/errors/error-types";
import { findChallengesByEvent } from "@/repositories/challenge.repository";
import {
  countSolvesInPath,
  createTeamPath,
  deactivateTeamPath,
  findActiveTeamPath,
  findPathById,
  findPathedChallengeIds,
  findPathsByEvent,
  findSolvedChallengeIds,
  findTeamPaths,
} from "@/repositories/sz-path.repository";
import { findPrereqsByEvent } from "@/repositories/sz-reveal.repository";
import { ensureCanScore } from "@/services/events/event-guard";
import {
  FREE_SWITCH_THRESHOLD,
  FULL_MULTIPLIER,
  PENALTY_MULTIPLIER,
} from "@/services/signal-zero/config";
import { syncUnlocks } from "@/services/signal-zero/reveal.service";

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

  return {
    welcomeSolved,
    canSelect: welcomeSolved && !attempts.some((a) => a.isActive),
    paths: paths.map((path) => {
      const attempt = byPathId.get(path.id);
      return {
        id: path.id,
        code: path.code,
        name: path.name,
        delivers: path.delivers,
        introNarration: path.introNarration,
        isActive: attempt?.isActive ?? false,
        // A path already attempted can never be re-entered — the unique
        // constraint on (team_id, path_id) exists to stop farming it twice.
        isAvailable: !attempt,
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
    // Two teammates pressing "choose path" together: the checks above both
    // passed, and the database decided. `sz_one_active_path` means a second
    // attempt is live, the (team_id, path_id) unique means this exact path was
    // already taken — both are the 409s checked for above, just later.
    if (isUniqueViolation(error, "sz_one_active_path"))
      throw new ConflictError("Your team is already on a path — switch instead");
    if (isUniqueViolation(error))
      throw new ConflictError("Your team has already run this path");
    throw error;
  }
}

/**
 * Switching paths. 8+ solves in the active path is a free switch at full
 * rewards; switching earlier costs 20% of everything earned in the *new* path.
 *
 * The old attempt's solves keep their snapshotted points — switching never
 * retroactively edits a score.
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

  const solvesInPath = await countSolvesInPath(teamId, active.pathId);
  const isFree = solvesInPath >= FREE_SWITCH_THRESHOLD;

  const attempt = await db.transaction(async (tx) => {
    const closed = await deactivateTeamPath(active.id, tx);
    // Zero rows means another request switched first; abort rather than open a
    // second active attempt and trip the one-active-path index.
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
      ? "Free switch — full rewards on the new path"
      : `Switched early (${solvesInPath}/${FREE_SWITCH_THRESHOLD} solves) — 80% rewards on the new path`,
  };
}
