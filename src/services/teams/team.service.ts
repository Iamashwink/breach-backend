import { ConflictError, NotFoundError, ValidationError } from "@/errors/error-types";
import { findEventById } from "@/repositories/event.repository";
import {
  addTeamMember,
  createTeam,
  findEventUser,
  findTeamByEventAndName,
  findTeamByJoinCode,
  findTeamById,
  findUserTeamMembership,
  getTeamMemberCount,
  getTeamMembers,
  registerForEvent,
} from "@/repositories/team.repository";

const MAX_TEAM_SIZE = 4;

function generateJoinCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function ensureEventIsJoinable(eventId: string) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");
  if (!event.isPublished) throw new ValidationError("Event is not open for registration");
  return event;
}

async function ensureRegistered(userId: string, eventId: string) {
  const existing = await findEventUser(eventId, userId);
  if (!existing) await registerForEvent(eventId, userId);
}

export async function createTeamForUser(userId: string, eventId: string, name: string) {
  await ensureEventIsJoinable(eventId);

  const existing = await findUserTeamMembership(eventId, userId);
  if (existing) throw new ConflictError("You are already in a team for this event");

  const nameConflict = await findTeamByEventAndName(eventId, name);
  if (nameConflict) throw new ConflictError("A team with that name already exists");

  await ensureRegistered(userId, eventId);

  const joinCode = generateJoinCode();
  const team = await createTeam({ eventId, name, joinCode, createdByUser: userId });
  await addTeamMember({ teamId: team.id, eventId, userId, role: "captain" });

  return { ...team, role: "captain" as const };
}

export async function joinTeamByCode(
  userId: string,
  eventId: string,
  name: string,
  joinCode: string,
) {
  await ensureEventIsJoinable(eventId);

  const existing = await findUserTeamMembership(eventId, userId);
  if (existing) throw new ConflictError("You are already in a team for this event");

  const team = await findTeamByJoinCode(eventId, joinCode);
  if (!team || team.name !== name)
    throw new NotFoundError("Team not found or join code is incorrect");

  const memberCount = await getTeamMemberCount(team.id);
  if (memberCount >= MAX_TEAM_SIZE)
    throw new ValidationError(`Team is full (max ${MAX_TEAM_SIZE} members)`);

  await ensureRegistered(userId, eventId);
  await addTeamMember({ teamId: team.id, eventId, userId, role: "member" });

  return { ...team, role: "member" as const };
}

export async function getMyTeam(userId: string, eventId: string) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");

  const membership = await findUserTeamMembership(eventId, userId);
  if (!membership) throw new NotFoundError("You are not in a team for this event");

  const team = await findTeamById(membership.teamId);
  if (!team) throw new NotFoundError("Team not found");

  const members = await getTeamMembers(team.id);

  return { ...team, myRole: membership.role, members };
}
