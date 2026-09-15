import { createHash } from "crypto";
import { ConflictError, NotFoundError, ValidationError } from "@/errors/error-types";
import { findUserTeamMembership } from "@/repositories/team.repository";
import { findChallengeById } from "@/repositories/challenge.repository";
import {
  countIncorrectAttempts,
  createSolve,
  createSubmission,
  findSolveByTeamAndChallenge,
  getChallengeSolveCount,
  getNextSolveOrder,
} from "@/repositories/submission.repository";

function hashFlag(flag: string): string {
  return createHash("sha256").update(flag.trim()).digest("hex");
}

function calculatePoints(
  initialPoints: number,
  minPoints: number,
  decayThreshold: number,
  decayType: "logarithmic" | "linear" | "static",
  solveCount: number,
): number {
  if (decayType === "static") return initialPoints;
  if (solveCount === 0) return initialPoints;
  if (solveCount >= decayThreshold) return minPoints;

  let ratio: number;
  if (decayType === "logarithmic") {
    ratio = Math.log(solveCount + 1) / Math.log(decayThreshold + 1);
  } else {
    ratio = solveCount / decayThreshold;
  }

  return Math.max(minPoints, Math.round(initialPoints - (initialPoints - minPoints) * ratio));
}

export async function submitFlag(
  userId: string,
  eventId: string,
  challengeId: string,
  rawFlag: string,
) {
  const challenge = await findChallengeById(challengeId, eventId);
  if (!challenge) throw new NotFoundError("Challenge not found");
  if (challenge.state !== "visible") throw new NotFoundError("Challenge not found");

  const membership = await findUserTeamMembership(eventId, userId);
  if (!membership) throw new ValidationError("You must be in a team to submit flags");

  const { teamId } = membership;

  // Already solved by this team
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

  // Correct — record submission then solve
  const submission = await createSubmission({ eventId, teamId, submittedBy: userId, challengeId, rawInput: rawFlag, verdict: "correct" });

  const solveCount = await getChallengeSolveCount(challengeId);
  const solveOrder = await getNextSolveOrder(challengeId);
  const basePoints = calculatePoints(
    challenge.initialPoints,
    challenge.minPoints,
    challenge.decayThreshold,
    challenge.decayType,
    solveCount,
  );

  await createSolve({
    teamId,
    challengeId,
    eventId,
    solvedBy: userId,
    submissionId: submission.id,
    basePoints,
    pointsAwarded: basePoints,
    solveOrder,
  });

  return {
    verdict: "correct",
    message: solveOrder === 1 ? "First blood! Correct flag!" : "Correct flag!",
    pointsAwarded: basePoints,
    solveOrder,
    firstBlood: solveOrder === 1,
  };
}
