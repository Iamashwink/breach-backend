import { and, count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { coreEventUser } from "@/models/core/event-user";
import { coreTeam } from "@/models/core/team";
import { coreTeamMember } from "@/models/core/team-member";

export async function findEventUser(eventId: string, userId: string) {
  const rows = await db
    .select()
    .from(coreEventUser)
    .where(and(eq(coreEventUser.eventId, eventId), eq(coreEventUser.userId, userId)));
  return rows[0] ?? null;
}

export async function registerForEvent(eventId: string, userId: string) {
  await db.insert(coreEventUser).values({ eventId, userId }).onConflictDoNothing();
}

export async function findTeamByEventAndName(eventId: string, name: string) {
  const rows = await db
    .select()
    .from(coreTeam)
    .where(and(eq(coreTeam.eventId, eventId), eq(coreTeam.name, name)));
  return rows[0] ?? null;
}

export async function findTeamByJoinCode(eventId: string, joinCode: string) {
  const rows = await db
    .select()
    .from(coreTeam)
    .where(and(eq(coreTeam.eventId, eventId), eq(coreTeam.joinCode, joinCode)));
  return rows[0] ?? null;
}

export async function findUserTeamMembership(eventId: string, userId: string) {
  const rows = await db
    .select({ teamId: coreTeamMember.teamId, role: coreTeamMember.role })
    .from(coreTeamMember)
    .where(and(eq(coreTeamMember.eventId, eventId), eq(coreTeamMember.userId, userId)));
  return rows[0] ?? null;
}

export async function getTeamMemberCount(teamId: string) {
  const rows = await db
    .select({ count: count() })
    .from(coreTeamMember)
    .where(eq(coreTeamMember.teamId, teamId));
  return Number(rows[0]?.count ?? 0);
}

export async function createTeam(data: {
  eventId: string;
  name: string;
  joinCode: string;
  createdByUser: string;
}) {
  const rows = await db.insert(coreTeam).values(data).returning();
  return rows[0]!;
}

export async function addTeamMember(data: {
  teamId: string;
  eventId: string;
  userId: string;
  role: "captain" | "member";
}) {
  const rows = await db.insert(coreTeamMember).values(data).returning();
  return rows[0]!;
}

export async function findTeamById(teamId: string) {
  const rows = await db.select().from(coreTeam).where(eq(coreTeam.id, teamId));
  return rows[0] ?? null;
}

export async function getTeamMembers(teamId: string) {
  return db
    .select({ userId: coreTeamMember.userId, role: coreTeamMember.role })
    .from(coreTeamMember)
    .where(eq(coreTeamMember.teamId, teamId));
}
