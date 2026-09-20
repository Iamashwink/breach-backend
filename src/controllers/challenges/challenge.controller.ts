import { logger } from "@/loggers/logger";
import {
  addChallenge,
  addHint,
  editChallenge,
  removeChallenge,
  listChallengesAdmin,
  listChallengesPlayer,
  listHints,
  listHintsForPlayer,
  removeHint,
  unlockHint,
} from "@/services/challenges/challenge.service";
import { submitFlag } from "@/services/challenges/submission.service";

export async function handleListChallengesAdmin(eventId: string) {
  return listChallengesAdmin(eventId);
}

export async function handleListChallengesPlayer(eventId: string) {
  return listChallengesPlayer(eventId);
}

export async function handleCreateChallenge(eventId: string, userId: string, body: Parameters<typeof addChallenge>[2]) {
  logger.info({ eventId, title: body.title }, "Creating challenge");
  const challenge = await addChallenge(eventId, userId, body);
  logger.info({ challengeId: challenge.id }, "Challenge created");
  return challenge;
}

export async function handleUpdateChallenge(
  challengeId: string,
  eventId: string,
  userId: string,
  body: Parameters<typeof editChallenge>[3],
) {
  return editChallenge(challengeId, eventId, userId, body);
}

export async function handleDeleteChallenge(challengeId: string, eventId: string) {
  logger.info({ challengeId, eventId }, "Deleting challenge");
  return removeChallenge(challengeId, eventId);
}


export async function handleCreateHint(
  challengeId: string,
  eventId: string,
  userId: string,
  body: Parameters<typeof addHint>[3],
) {
  logger.info({ challengeId }, "Adding hint");
  return addHint(challengeId, eventId, userId, body);
}

export async function handleDeleteHint(hintId: string, eventId: string) {
  logger.info({ hintId }, "Deleting hint");
  return removeHint(hintId, eventId);
}

export async function handleListHints(challengeId: string, eventId: string) {
  return listHints(challengeId, eventId);
}

export async function handleListHintsPlayer(challengeId: string, eventId: string, userId: string) {
  return listHintsForPlayer(challengeId, eventId, userId);
}

export async function handleUnlockHint(
  hintId: string,
  challengeId: string,
  eventId: string,
  userId: string,
) {
  logger.info({ hintId, challengeId }, "Unlocking hint");
  return unlockHint(hintId, challengeId, eventId, userId);
}

export async function handleSubmitFlag(
  userId: string,
  eventId: string,
  challengeId: string,
  flag: string,
) {
  logger.info({ userId, challengeId }, "Flag submission");
  const result = await submitFlag(userId, eventId, challengeId, flag);
  logger.info({ challengeId, verdict: result.verdict }, "Submission verdict");
  return result;
}
