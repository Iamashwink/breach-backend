import { logger } from "@/loggers/logger";
import { createTeamForUser, getMyTeam, joinTeamByCode } from "@/services/teams/team.service";

export async function handleCreateTeam(userId: string, eventId: string, name: string) {
  logger.info({ userId, eventId, name }, "Creating team");
  const team = await createTeamForUser(userId, eventId, name);
  logger.info({ teamId: team.id }, "Team created");
  return team;
}

export async function handleJoinTeam(
  userId: string,
  eventId: string,
  name: string,
  joinCode: string,
) {
  logger.info({ userId, eventId, name }, "Joining team");
  const team = await joinTeamByCode(userId, eventId, name, joinCode);
  logger.info({ teamId: team.id }, "Joined team");
  return team;
}

export async function handleGetMyTeam(userId: string, eventId: string) {
  return getMyTeam(userId, eventId);
}
