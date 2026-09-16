import { createHash } from "crypto";
import { db } from "@/db/client";
import { NotFoundError, ValidationError } from "@/errors/error-types";
import { ensureCanScore } from "@/services/events/event-guard";
import { findChallengeById, lockChallengeForUpdate } from "@/repositories/challenge.repository";
import {
  countIncorrectAttempts,
  createSolve,
  createSubmission,
  findSolveByTeamAndChallenge,
  getChallengeSolveCount,
  getNextSolveOrder,
} from "@/repositories/submission.repository";
import {
  findActiveTeamPath,
  findPathChallenge,
  findPathsByEvent,
} from "@/repositories/sz-path.repository";
import { isChallengeUnlocked } from "@/repositories/sz-reveal.repository";
import { findActiveGlitch } from "@/repositories/sz-time-glitch.repository";
import { createFragment } from "@/repositories/sz-fragment.repository";
import { FULL_MULTIPLIER } from "@/services/signal-zero/config";
import { syncUnlocks } from "@/services/signal-zero/reveal.service";
import { calculatePoints } from "@/services/challenges/scoring";

function hashFlag(flag: string): string {
  return createHash("sha256").update(flag.trim()).digest("hex");
}

export async function submitFlag(
  userId: string,
  eventId: string,
  challengeId: string,
  rawFlag: string,
) {
  const { teamId } = await ensureCanScore(userId, eventId, "submit flags");

  const challenge = await findChallengeById(challengeId, eventId);
  if (!challenge) throw new NotFoundError("Challenge not found");
  if (challenge.state !== "visible") throw new NotFoundError("Challenge not found");

  // An event with no paths is a plain CTF and the module never engages — which
  // is the whole point of keeping the reveal rules out of core.
  const paths = await findPathsByEvent(eventId);
  const moduleActive = paths.length > 0;

  const [activePath, pathChallenge] = await Promise.all([
    moduleActive ? findActiveTeamPath(teamId) : Promise.resolve(null),
    moduleActive ? findPathChallenge(challengeId) : Promise.resolve(null),
  ]);

  if (moduleActive) {
    const unlocked = await isChallengeUnlocked(teamId, challengeId);
    if (!unlocked) throw new ValidationError("That challenge is not open to your team yet");

    // Leaving a path closes it. The unlock rows from the abandoned attempt are
    // kept as history, so being unlocked is not on its own permission to submit
    // — otherwise a team could switch away and keep farming the old path's
    // revealed challenges, which also counts toward the next free switch.
    if (pathChallenge && pathChallenge.pathId !== activePath?.pathId) {
      throw new ValidationError("That challenge belongs to a path your team has left");
    }
  }

  // Already solved by this team. Re-checked inside the transaction below, which
  // is the authority; this is only here to avoid opening one for a repeat.
  const existingSolve = await findSolveByTeamAndChallenge(teamId, challengeId);
  if (existingSolve) {
    await createSubmission({ eventId, teamId, submittedBy: userId, challengeId, rawInput: rawFlag, verdict: "duplicate" });
    return { verdict: "duplicate", message: "Your team has already solved this challenge" };
  }

  // Max attempts check
  if (challenge.maxAttempts !== null) {
    const attempts = await countIncorrectAttempts(teamId, challengeId);
    if (attempts >= challenge.maxAttempts) {
      await createSubmission({ eventId, teamId, submittedBy: userId, challengeId, rawInput: rawFlag, verdict: "rate_limited" });
      return { verdict: "rate_limited", message: `Maximum attempts (${challenge.maxAttempts}) reached` };
    }
  }

  const isCorrect = hashFlag(rawFlag) === challenge.flagHash;

  if (!isCorrect) {
    await createSubmission({ eventId, teamId, submittedBy: userId, challengeId, rawInput: rawFlag, verdict: "incorrect" });
    return { verdict: "incorrect", message: "Incorrect flag" };
  }

  const now = new Date();
  const glitch = moduleActive ? await findActiveGlitch(eventId, now) : null;

  // The path penalty is a penalty on *that path*. The welcome challenge and the
  // convergence final belong to no path, so a 0.80 carried from a skip must not
  // follow the team onto them — the convergence final is the highest-value
  // challenge in the event.
  const onActivePath = pathChallenge !== null && pathChallenge.pathId === activePath?.pathId;
  const multiplier = onActivePath ? activePath!.rewardMultiplier : FULL_MULTIPLIER;

  const result = await db.transaction(async (tx) => {
    // Serialises every concurrent solve of this challenge. Both the decayed
    // price and `solve_order` are read-then-written, and `solve_order` is under
    // a unique index — without the lock two solvers compute the same order and
    // the second transaction dies on the constraint, losing a correct solve.
    await lockChallengeForUpdate(challengeId, eventId, tx);

    // Authoritative duplicate check: a teammate's submission may have committed
    // between the fast-path check above and this lock.
    const alreadySolved = await findSolveByTeamAndChallenge(teamId, challengeId, tx);
    if (alreadySolved) {
      await createSubmission(
        { eventId, teamId, submittedBy: userId, challengeId, rawInput: rawFlag, verdict: "duplicate" },
        tx,
      );
      return { kind: "duplicate" as const };
    }

    const [solveCount, solveOrder] = await Promise.all([
      getChallengeSolveCount(challengeId, tx),
      getNextSolveOrder(challengeId, tx),
    ]);

    // A Time Glitch suspends decay: the challenge is worth its full initial
    // value for anyone who lands it inside the window, permanently.
    const basePoints = glitch
      ? challenge.initialPoints
      : calculatePoints(challenge, solveCount);
    const pointsAwarded = Math.round(basePoints * Number(multiplier));

    const submission = await createSubmission(
      { eventId, teamId, submittedBy: userId, challengeId, rawInput: rawFlag, verdict: "correct" },
      tx,
    );

    await createSolve(
      {
        teamId,
        challengeId,
        eventId,
        solvedBy: userId,
        submissionId: submission.id,
        basePoints,
        multiplier,
        pointsAwarded,
        solveOrder,
      },
      tx,
    );

    if (!moduleActive) {
      return { kind: "solved" as const, basePoints, pointsAwarded, solveOrder, revealed: [] as string[], fragment: null };
    }

    // A path's final challenge hands over its fragment (WHO / HOW / WHY).
    // Holding all three is what satisfies the convergence prerequisites, which
    // syncUnlocks then picks up on the very next line.
    let fragment: string | null = null;
    if (pathChallenge?.isPathFinal && pathChallenge.fragmentKey) {
      await createFragment(
        { eventId, teamId, fragmentKey: pathChallenge.fragmentKey, challengeId },
        tx,
      );
      fragment = pathChallenge.fragmentKey;
    }

    const revealed = await syncUnlocks(teamId, eventId, "solve", tx);
    return { kind: "solved" as const, basePoints, pointsAwarded, solveOrder, revealed, fragment };
  });

  if (result.kind === "duplicate") {
    return { verdict: "duplicate", message: "Your team has already solved this challenge" };
  }

  return {
    verdict: "correct",
    message: result.solveOrder === 1 ? "First blood! Correct flag!" : "Correct flag!",
    basePoints: result.basePoints,
    multiplier,
    pointsAwarded: result.pointsAwarded,
    solveOrder: result.solveOrder,
    firstBlood: result.solveOrder === 1,
    timeGlitch: glitch ? { id: glitch.id, label: glitch.label } : null,
    postStory: pathChallenge?.postStory ?? null,
    fragment: result.fragment,
    revealed: result.revealed,
  };
}
