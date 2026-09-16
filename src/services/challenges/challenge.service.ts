import { createHash } from "crypto";
import { ConflictError, NotFoundError, ValidationError } from "@/errors/error-types";
import { findEventById } from "@/repositories/event.repository";
import { ensureCanScore } from "@/services/events/event-guard";
import { findCategoryById } from "@/repositories/category.repository";
import { findUserTeamMembership } from "@/repositories/team.repository";
import { findPathsByEvent } from "@/repositories/sz-path.repository";
import { isChallengeUnlocked } from "@/repositories/sz-reveal.repository";
import {
  createChallenge,
  createHint,
  createHintUnlock,
  deleteHint,
  findChallengeById,
  findChallengesByEvent,
  findHintById,
  findHintsByChallenge,
  findHintUnlock,
  findUnlockedHintsByTeam,
  findVisibleChallengesByEvent,
  updateChallenge,
} from "@/repositories/challenge.repository";

function hashFlag(flag: string): string {
  return createHash("sha256").update(flag.trim()).digest("hex");
}

async function ensureEventExists(eventId: string) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");
  return event;
}

async function ensureChallengeExists(challengeId: string, eventId: string) {
  const challenge = await findChallengeById(challengeId, eventId);
  if (!challenge) throw new NotFoundError("Challenge not found");
  return challenge;
}

export async function listChallengesAdmin(eventId: string) {
  await ensureEventExists(eventId);
  return findChallengesByEvent(eventId);
}

export async function listChallengesPlayer(eventId: string) {
  await ensureEventExists(eventId);
  return findVisibleChallengesByEvent(eventId);
}

export async function addChallenge(
  eventId: string,
  userId: string,
  body: {
    title: string;
    description: string;
    categoryId: number;
    difficulty: "easy" | "medium" | "hard" | "expert";
    initialPoints: number;
    minPoints: number;
    decayThreshold?: number;
    decayType?: "logarithmic" | "linear" | "static";
    flag: string;
    maxAttempts?: number;
    author?: string;
  },
) {
  await ensureEventExists(eventId);

  const category = await findCategoryById(body.categoryId);
  if (!category) throw new NotFoundError("Category not found");

  if (body.minPoints > body.initialPoints)
    throw new ValidationError("minPoints cannot exceed initialPoints");

  const { flag, ...rest } = body;
  return createChallenge({ ...rest, eventId, flagHash: hashFlag(flag), createdBy: userId });
}

export async function editChallenge(
  challengeId: string,
  eventId: string,
  userId: string,
  body: {
    title?: string;
    description?: string;
    categoryId?: number;
    difficulty?: "easy" | "medium" | "hard" | "expert";
    initialPoints?: number;
    minPoints?: number;
    decayThreshold?: number;
    decayType?: "logarithmic" | "linear" | "static";
    flag?: string;
    state?: "hidden" | "visible" | "locked";
    maxAttempts?: number | null;
    author?: string;
  },
) {
  const challenge = await ensureChallengeExists(challengeId, eventId);

  if (body.categoryId) {
    const category = await findCategoryById(body.categoryId);
    if (!category) throw new NotFoundError("Category not found");
  }

  const minPoints = body.minPoints ?? challenge.minPoints;
  const initialPoints = body.initialPoints ?? challenge.initialPoints;
  if (minPoints > initialPoints)
    throw new ValidationError("minPoints cannot exceed initialPoints");

  const { flag, ...rest } = body;
  const data: Parameters<typeof updateChallenge>[2] = { ...rest, updatedBy: userId };
  if (flag) data.flagHash = hashFlag(flag);

  const updated = await updateChallenge(challengeId, eventId, data);
  if (!updated) throw new NotFoundError("Challenge not found");
  return updated;
}

export async function addHint(
  challengeId: string,
  eventId: string,
  userId: string,
  body: {
    body: string;
    cost?: number;
    sortOrder?: number;
    requiresHintId?: string;
  },
) {
  await ensureChallengeExists(challengeId, eventId);
  return createHint({ ...body, challengeId, eventId, createdBy: userId });
}

export async function removeHint(hintId: string, eventId: string) {
  const hint = await findHintById(hintId, eventId);
  if (!hint) throw new NotFoundError("Hint not found");
  return deleteHint(hintId, eventId);
}

export async function listHints(challengeId: string, eventId: string) {
  await ensureChallengeExists(challengeId, eventId);
  return findHintsByChallenge(challengeId);
}

async function ensureTeamMembership(userId: string, eventId: string) {
  const membership = await findUserTeamMembership(eventId, userId);
  if (!membership) throw new ValidationError("You must be in a team to access hints");
  return membership;
}

export async function listHintsForPlayer(challengeId: string, eventId: string, userId: string) {
  await ensureChallengeExists(challengeId, eventId);
  const membership = await ensureTeamMembership(userId, eventId);

  const [hints, unlocked] = await Promise.all([
    findHintsByChallenge(challengeId),
    findUnlockedHintsByTeam(membership.teamId, eventId),
  ]);

  const unlockedIds = new Set(unlocked.map((u) => u.hintId));

  return hints.map(({ body, ...hint }) => ({
    ...hint,
    isUnlocked: unlockedIds.has(hint.id),
    body: unlockedIds.has(hint.id) ? body : null,
  }));
}

export async function unlockHint(hintId: string, challengeId: string, eventId: string, userId: string) {
  const challenge = await ensureChallengeExists(challengeId, eventId);
  // Unlocking spends points, so it is gated like a submission — not merely by
  // team membership the way reading the hint list is.
  const membership = await ensureCanScore(userId, eventId, "unlock hints");

  // Same visibility rules as submitting. Without these a player who guesses a
  // challenge id can buy hints for a challenge their reveal window has not
  // reached, and confirm it exists along with its hint structure.
  if (challenge.state !== "visible") throw new NotFoundError("Challenge not found");

  const paths = await findPathsByEvent(eventId);
  if (paths.length > 0) {
    const unlocked = await isChallengeUnlocked(membership.teamId, challengeId);
    if (!unlocked) throw new ValidationError("That challenge is not open to your team yet");
  }

  const hint = await findHintById(hintId, eventId);
  if (!hint || hint.challengeId !== challengeId) throw new NotFoundError("Hint not found");

  const alreadyUnlocked = await findHintUnlock(membership.teamId, hintId);
  if (alreadyUnlocked) throw new ConflictError("Hint already unlocked");

  if (hint.requiresHintId) {
    const prereqUnlocked = await findHintUnlock(membership.teamId, hint.requiresHintId);
    if (!prereqUnlocked) throw new ValidationError("You must unlock the previous hint first");
  }

  const unlock = await createHintUnlock({
    teamId: membership.teamId,
    hintId,
    eventId,
    costPaid: hint.cost,
    unlockedBy: userId,
  });

  return { ...hint, isUnlocked: true, costPaid: unlock.costPaid };
}
