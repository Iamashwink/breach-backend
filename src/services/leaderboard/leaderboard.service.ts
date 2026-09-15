import { NotFoundError } from "@/errors/error-types";
import { findEventById } from "@/repositories/event.repository";
import { getFrozenLeaderboard, getLiveLeaderboard } from "@/repositories/leaderboard.repository";

export async function getLeaderboard(eventId: string) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");

  if (event.isFrozen && event.frozenAt) {
    return { frozen: true, frozenAt: event.frozenAt, entries: await getFrozenLeaderboard(eventId, event.frozenAt) };
  }

  return { frozen: false, frozenAt: null, entries: await getLiveLeaderboard(eventId) };
}
