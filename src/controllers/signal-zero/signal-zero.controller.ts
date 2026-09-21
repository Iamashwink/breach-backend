import { getBoard } from "@/services/signal-zero/board.service";
import { listPaths, selectPath, switchPath } from "@/services/signal-zero/path.service";
import { skipChallenge } from "@/services/signal-zero/skip.service";
import {
  addGlitch,
  generateGlitchSchedule,
  getGlitchStatus,
  listGlitches,
  removeAllGlitches,
  removeGlitch,
} from "@/services/signal-zero/time-glitch.service";

export async function handleGetBoard(userId: string, eventId: string) {
  return getBoard(userId, eventId);
}

export async function handleListPaths(userId: string, eventId: string) {
  return listPaths(userId, eventId);
}

export async function handleSelectPath(userId: string, eventId: string, pathId: string) {
  return selectPath(userId, eventId, pathId);
}

export async function handleSwitchPath(userId: string, eventId: string, pathId: string) {
  return switchPath(userId, eventId, pathId);
}

export async function handleSkipChallenge(userId: string, eventId: string, challengeId: string) {
  return skipChallenge(userId, eventId, challengeId);
}

export async function handleGlitchStatus(eventId: string) {
  return getGlitchStatus(eventId);
}

export async function handleListGlitches(eventId: string) {
  return listGlitches(eventId);
}

export async function handleCreateGlitch(
  eventId: string,
  userId: string,
  body: { label?: string; startsAt: string; endsAt: string },
) {
  return addGlitch(eventId, userId, body);
}

export async function handleGenerateGlitches(
  eventId: string,
  userId: string,
  body: { everyMinutes?: number; durationMinutes?: number; firstAt?: string },
) {
  return generateGlitchSchedule(eventId, userId, body);
}

export async function handleDeleteGlitch(glitchId: string, eventId: string) {
  return removeGlitch(glitchId, eventId);
}

export async function handleDeleteAllGlitches(eventId: string) {
  return removeAllGlitches(eventId);
}
