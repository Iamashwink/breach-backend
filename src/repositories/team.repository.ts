import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { coreEventUser } from "@/models/core/event-user";
import { coreTeam } from "@/models/core/team";
import { coreTeamMember } from "@/models/core/team-member";
import { coreUser } from "@/models/core/user";
import { coreSolve } from "@/models/core/solve";
import { coreSubmission } from "@/models/core/submission";
import { coreChallenge } from "@/models/core/challenge";
import { coreHintUnlock } from "@/models/core/hint-unlock";
import { szSkip } from "@/models/event-specific/skip";
import { szTeamPath } from "@/models/event-specific/team-path";

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
    .select({
      userId: coreTeamMember.userId,
      role: coreTeamMember.role,
      username: coreUser.username,
      displayName: coreUser.displayName,
    })
    .from(coreTeamMember)
    .innerJoin(coreUser, eq(coreTeamMember.userId, coreUser.id))
    .where(eq(coreTeamMember.teamId, teamId));
}

export async function findAllTeamsByEvent(eventId: string, executor: Executor = db) {
  const teams = await executor
    .select()
    .from(coreTeam)
    .where(eq(coreTeam.eventId, eventId))
    .orderBy(asc(coreTeam.createdAt));

  const result = [];
  for (const t of teams) {
    const members = await getTeamMembers(t.id, executor);
    const solves = await executor
      .select({ totalPoints: sql<number>`COALESCE(SUM(${coreSolve.pointsAwarded}), 0)` })
      .from(coreSolve)
      .where(and(eq(coreSolve.teamId, t.id), eq(coreSolve.eventId, eventId), isNull(coreSolve.revokedAt)));
    result.push({
      ...t,
      banned: !!t.disqualifiedAt,
      members,
      score: Number(solves[0]?.totalPoints ?? 0),
    });
  }
  return result;
}

export async function updateTeam(
  teamId: string,
  eventId: string,
  data: Partial<{ banned: boolean; disqualified: boolean; reason: string; name: string; isHidden: boolean }>,
  adminUserId?: string,
  executor: Executor = db,
) {
  const updatePayload: Record<string, any> = {};

  if (data.name !== undefined) {
    updatePayload.name = data.name;
  }
  if (data.isHidden !== undefined) {
    updatePayload.isHidden = data.isHidden;
  }
  const isBanning = data.banned === true || data.disqualified === true;
  const isUnbanning = data.banned === false || data.disqualified === false;

  if (isBanning) {
    updatePayload.disqualifiedAt = new Date();
    updatePayload.disqualifiedReason = data.reason || "Disqualified by admin";
    if (adminUserId) updatePayload.disqualifiedBy = adminUserId;
  } else if (isUnbanning) {
    updatePayload.disqualifiedAt = null;
    updatePayload.disqualifiedReason = null;
    updatePayload.disqualifiedBy = null;
  }

  if (Object.keys(updatePayload).length === 0) {
    const existing = await executor
      .select()
      .from(coreTeam)
      .where(and(eq(coreTeam.id, teamId), eq(coreTeam.eventId, eventId)));
    return existing[0] ?? null;
  }

  const rows = await executor
    .update(coreTeam)
    .set(updatePayload)
    .where(and(eq(coreTeam.id, teamId), eq(coreTeam.eventId, eventId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteTeam(teamId: string, eventId: string) {
  return db.transaction(async (tx) => {
    await tx.delete(coreSolve).where(and(eq(coreSolve.teamId, teamId), eq(coreSolve.eventId, eventId)));
    await tx.delete(coreSubmission).where(and(eq(coreSubmission.teamId, teamId), eq(coreSubmission.eventId, eventId)));
    await tx.delete(coreHintUnlock).where(and(eq(coreHintUnlock.teamId, teamId), eq(coreHintUnlock.eventId, eventId)));
    await tx.delete(szSkip).where(and(eq(szSkip.teamId, teamId), eq(szSkip.eventId, eventId)));
    await tx.delete(szTeamPath).where(and(eq(szTeamPath.teamId, teamId), eq(szTeamPath.eventId, eventId)));
    await tx.delete(coreTeamMember).where(and(eq(coreTeamMember.teamId, teamId), eq(coreTeamMember.eventId, eventId)));
    const rows = await tx
      .delete(coreTeam)
      .where(and(eq(coreTeam.id, teamId), eq(coreTeam.eventId, eventId)))
      .returning();
    return rows[0] ?? null;
  });
}

export async function findRecentSubmissions(eventId: string, limit = 50, executor: Executor = db) {
  const rows = await executor
    .select({
      id: coreSubmission.id,
      teamId: coreSubmission.teamId,
      teamName: coreTeam.name,
      challengeId: coreSubmission.challengeId,
      challengeTitle: coreChallenge.title,
      flag: coreSubmission.rawInput,
      verdict: coreSubmission.verdict,
      submittedAt: coreSubmission.submittedAt,
    })
    .from(coreSubmission)
    .innerJoin(coreTeam, eq(coreSubmission.teamId, coreTeam.id))
    .innerJoin(coreChallenge, eq(coreSubmission.challengeId, coreChallenge.id))
    .where(eq(coreSubmission.eventId, eventId))
    .orderBy(desc(coreSubmission.submittedAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    id: r.id.toString(),
  }));
}

