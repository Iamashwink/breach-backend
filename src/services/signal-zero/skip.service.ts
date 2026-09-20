import { db } from "@/db/client";
import { ConflictError, NotFoundError, ValidationError } from "@/errors/error-types";
import { findChallengeById } from "@/repositories/challenge.repository";
import { findSolveByTeamAndChallenge } from "@/repositories/submission.repository";
import {
  findActiveTeamPath,
  findPathChallenge,
  findTeamPaths,
  lockActiveTeamPath,
  penaliseTeamPath,
} from "@/repositories/sz-path.repository";
import { createSkip, findSkippedChallengeIds } from "@/repositories/sz-skip.repository";
import { isChallengeUnlocked } from "@/repositories/sz-reveal.repository";
import { ensureCanScore } from "@/services/events/event-guard";
import { PENALTY_MULTIPLIER, SKIP_QUOTA } from "@/services/signal-zero/config";
import { syncUnlocks } from "@/services/signal-zero/reveal.service";

/**
 * Spending a skip: closes a challenge without a flag, drops the active path
 * attempt's multiplier to 0.80, and advances the reveal window.
 *
 * No core_solve row is written, so a skipped challenge is worth zero — not 80%
 * of its value. The 80% applies to everything the team earns in that path
 * afterwards.
 */
export async function skipChallenge(userId: string, eventId: string, challengeId: string) {
  const { teamId } = await ensureCanScore(userId, eventId, "skip a challenge");

  const challenge = await findChallengeById(challengeId, eventId);
  if (!challenge || challenge.state !== "visible") throw new NotFoundError("Challenge not found");

  const teamPaths = await findTeamPaths(teamId);
  const pathChallenge = await findPathChallenge(challengeId);
  if (!pathChallenge) throw new ValidationError("This challenge cannot be skipped");
  const targetPath = teamPaths.find((p) => p.pathId === pathChallenge.pathId);
  if (!targetPath)
    throw new ValidationError("That challenge is not on an entered path");

  const unlocked = await isChallengeUnlocked(teamId, challengeId);
  if (!unlocked) throw new ValidationError("That challenge is not open to your team yet");

  const result = await db.transaction(async (tx) => {
    const locked = await lockActiveTeamPath(teamId, tx);
    if (!locked && teamPaths.length === 0) throw new ValidationError("Your team is not on a path yet");

    const solved = await findSolveByTeamAndChallenge(teamId, challengeId, tx);
    if (solved) throw new ConflictError("Your team has already solved this challenge");

    // One query answers both questions: have we skipped this already, and how
    // many have we spent.
    const skipped = await findSkippedChallengeIds(teamId, eventId, tx);
    if (skipped.includes(challengeId)) throw new ConflictError("Already skipped");
    if (skipped.length >= SKIP_QUOTA)
      throw new ValidationError(`No skips left (${SKIP_QUOTA} used)`);

    await createSkip(
      { eventId, teamId, challengeId, teamPathId: targetPath.id, usedBy: userId },
      tx,
    );
    await penaliseTeamPath(targetPath.id, PENALTY_MULTIPLIER, tx);
    const revealed = await syncUnlocks(teamId, eventId, "skip", tx);

    return { used: skipped.length, revealed };
  });

  const remaining = SKIP_QUOTA - result.used - 1;
  return {
    skipped: challengeId,
    skipsUsed: result.used + 1,
    skipsRemaining: remaining,
    rewardMultiplier: PENALTY_MULTIPLIER,
    revealed: result.revealed,
    message: `Challenge skipped. Rewards on this path are now 80%. ${remaining} skip(s) left.`,
  };
}
