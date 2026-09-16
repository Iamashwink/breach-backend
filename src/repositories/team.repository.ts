import { and, count, eq } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { coreEventUser } from "@/models/core/event-user";
import { coreTeam } from "@/models/core/team";
import { coreTeamMember } from "@/models/core/team-member";

export async function findEventUser(eventId: string, userId: string, executor: Executor = db) {
  const rows = await executor
    .select()
    .from(coreEventUser)
    .where(and(eq(coreEventUser.eventId, eventId), eq(coreEventUser.userId, userId)));
  return rows[0] ?? null;
}

export async function registerForEvent(eventId: string, userId: string, executor: Executor = db) {
  await executor.insert(coreEventUser).values({ eventId, userId }).onConflictDoNothing();
}

export async function findTeamByEventAndName(eventId: string, name: string, executor: Executor = db) {
  const rows = await executor
    .select()
    .from(coreTeam)
    .where(and(eq(coreTeam.eventId, eventId), eq(coreTeam.name, name)));
  return rows[0] ?? null;
}

export async function findTeamByJoinCode(eventId: string, joinCode: string, executor: Executor = db) {
  const rows = await executor
    .select()
    .from(coreTeam)
    .where(and(eq(coreTeam.eventId, eventId), eq(coreTeam.joinCode, joinCode)));
  return rows[0] ?? null;
}

export async function findUserTeamMembership(eventId: string, userId: string, executor: Executor = db) {
  const rows = await executor
    .select({ teamId: coreTeamMember.teamId, role: coreTeamMember.role })
    .from(coreTeamMember)
    .where(and(eq(coreTeamMember.eventId, eventId), eq(coreTeamMember.userId, userId)));
  return rows[0] ?? null;
}

export async function getTeamMemberCount(teamId: string, executor: Executor = db) {
  const rows = await executor
    .select({ count: count() })
    .from(coreTeamMember)
    .where(eq(coreTeamMember.teamId, teamId));
  return Number(rows[0]?.count ?? 0);
}

/**
 * Returns null when the join code was already taken, so the caller can generate
 * another and retry. Only that collision is absorbed — a duplicate team name
 * still throws, because it is a real 409 the caller must report rather than
 * silently paper over with a fresh code.
 */
export async function createTeam(data: {
  eventId: string;
  name: string;
  joinCode: string;
  createdByUser: string;
}, executor: Executor = db) {
  const rows = await executor
    .insert(coreTeam)
    .values(data)
    .onConflictDoNothing({ target: coreTeam.joinCode })
    .returning();
  return rows[0] ?? null;
}

export async function addTeamMember(data: {
  teamId: string;
  eventId: string;
  userId: string;
  role: "captain" | "member";
}, executor: Executor = db) {
  const rows = await executor.insert(coreTeamMember).values(data).returning();
  return rows[0]!;
}

/**
 * The team row, locked for the rest of the caller's transaction. Joining reads
 * the member count and then writes a member; without the lock two people using
 * the same join code at once both see room for one more.
 */
export async function lockTeamById(teamId: string, executor: Executor = db) {
  const rows = await executor.select().from(coreTeam).where(eq(coreTeam.id, teamId)).for("update");
  return rows[0] ?? null;
}

export async function findTeamById(teamId: string, executor: Executor = db) {
  const rows = await executor.select().from(coreTeam).where(eq(coreTeam.id, teamId));
  return rows[0] ?? null;
}

export async function getTeamMembers(teamId: string, executor: Executor = db) {
  return executor
    .select({ userId: coreTeamMember.userId, role: coreTeamMember.role })
    .from(coreTeamMember)
    .where(eq(coreTeamMember.teamId, teamId));
}
