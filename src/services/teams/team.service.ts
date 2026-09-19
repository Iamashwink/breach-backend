import { db, type Executor } from "@/db/client";
import { isUniqueViolation } from "@/errors/db-errors";
import { ConflictError, NotFoundError, ValidationError } from "@/errors/error-types";
import { syncUnlocks } from "@/services/signal-zero/reveal.service";
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
  lockTeamById,
  registerForEvent,
} from "@/repositories/team.repository";

const MAX_TEAM_SIZE = 4;

/**
 * Join codes are read aloud and typed in by hand, so the alphabet drops the
 * characters people confuse — I/1, O/0. Its length of 32 divides 256 exactly,
 * which keeps the modulo below unbiased.
 */
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const JOIN_CODE_LENGTH = 6;
const JOIN_CODE_ATTEMPTS = 5;

function generateJoinCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(JOIN_CODE_LENGTH));
  let code = "";
  for (const byte of bytes) code += JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length];
  return code;
}

async function ensureEventIsJoinable(eventId: string) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");
  if (!event.isPublished) throw new ValidationError("Event is not open for registration");
  return event;
}

async function ensureRegistered(userId: string, eventId: string, executor: Executor = db) {
  const existing = await findEventUser(eventId, userId, executor);
  if (!existing) await registerForEvent(eventId, userId, executor);
}

export async function createTeamForUser(userId: string, eventId: string, name: string) {
  await ensureEventIsJoinable(eventId);

  const existing = await findUserTeamMembership(eventId, userId);
  if (existing) throw new ConflictError("You are already in a team for this event");

  const nameConflict = await findTeamByEventAndName(eventId, name);
  if (nameConflict) throw new ConflictError("A team with that name already exists");

  try {
    // One transaction: a team whose captain row failed to land would still own
    // its name under unique(event_id, name), so the user could neither use the
    // team nor re-create it.
    const team = await db.transaction(async (tx) => {
      await ensureRegistered(userId, eventId, tx);

      // createTeam returns null when the generated join code was already taken;
      // a fresh code and another go is the entire recovery. onConflictDoNothing
      // raises nothing, so the transaction stays usable across attempts.
      let created: Awaited<ReturnType<typeof createTeam>> = null;
      for (let attempt = 0; attempt < JOIN_CODE_ATTEMPTS && !created; attempt += 1) {
        created = await createTeam(
          { eventId, name, joinCode: generateJoinCode(), createdByUser: userId },
          tx,
        );
      }
      if (!created) throw new ConflictError("Could not allocate a join code — please try again");

      await addTeamMember({ teamId: created.id, eventId, userId, role: "captain" }, tx);

      // Opens whatever needs no prerequisites — for Signal Zero, the welcome
      // challenge, which gates path selection.
      await syncUnlocks(created.id, eventId, "initial", tx);
      return created;
    });

    const members = await getTeamMembers(team.id);
    return { ...team, role: "captain" as const, myRole: "captain" as const, members };
  } catch (error) {
    // The name check above is advisory; two teams claiming one name at the same
    // instant are separated here.
    if (isUniqueViolation(error)) throw new ConflictError("A team with that name already exists");
    throw error;
  }
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

  try {
    const team = await db.transaction(async (tx) => {
      const found = await findTeamByJoinCode(eventId, joinCode, tx);
      if (!found || found.name !== name)
        throw new NotFoundError("Team not found or join code is incorrect");

      // Lock before counting: the capacity check is read-then-write, and two
      // people pasting the same code together would both see room for one more.
      await lockTeamById(found.id, tx);

      const memberCount = await getTeamMemberCount(found.id, tx);
      if (memberCount >= MAX_TEAM_SIZE)
        throw new ValidationError(`Team is full (max ${MAX_TEAM_SIZE} members)`);

      await ensureRegistered(userId, eventId, tx);
      await addTeamMember({ teamId: found.id, eventId, userId, role: "member" }, tx);
      await syncUnlocks(found.id, eventId, "initial", tx);
      return found;
    });

    const members = await getTeamMembers(team.id);
    return { ...team, role: "member" as const, myRole: "member" as const, members };
  } catch (error) {
    // core_team_member_event_user_uq — the same user joined from two requests.
    if (isUniqueViolation(error))
      throw new ConflictError("You are already in a team for this event");
    throw error;
  }
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
