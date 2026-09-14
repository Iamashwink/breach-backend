import { getLeaderboard } from "@/services/leaderboard/leaderboard.service";

export async function handleGetLeaderboard(eventId: string) {
  return getLeaderboard(eventId);
}
