import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  coreChallenge,
  coreEvent,
  coreEventUser,
  coreHint,
  coreHintUnlock,
  coreSolve,
  coreSubmission,
  coreTeam,
  coreTeamMember,
} from "@/models/core";
import {
  szChallengePrereq,
  szConvergenceFragment,
  szPathChallenge,
  szPath,
  szSkip,
  szTeamPath,
  szTimeGlitch,
  szUnlockedChallenge,
} from "@/models/event-specific";

export async function findAllEvents() {
  return db.select().from(coreEvent).orderBy(coreEvent.createdAt);
}

export async function findPublishedEvents() {
  return db.select().from(coreEvent).where(eq(coreEvent.isPublished, true)).orderBy(coreEvent.startsAt);
}

export async function findEventById(id: string) {
  const rows = await db.select().from(coreEvent).where(eq(coreEvent.id, id));
  return rows[0] ?? null;
}

export async function findEventBySlug(slug: string) {
  const rows = await db.select().from(coreEvent).where(eq(coreEvent.slug, slug));
  return rows[0] ?? null;
}

export async function createEvent(data: {
  name: string;
  slug: string;
  description?: string;
  startsAt?: Date;
  endsAt?: Date;
  createdBy?: string;
}) {
  const rows = await db.insert(coreEvent).values(data).returning();
  return rows[0]!;
}

export async function updateEvent(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    // Nullable: an explicit null clears the date, which is how a published
    // event is taken back to draft.
    startsAt: Date | null;
    endsAt: Date | null;
    isPublished: boolean;
    isFrozen: boolean;
    frozenAt: Date | null;
    updatedBy: string;
  }>,
) {
  const rows = await db.update(coreEvent).set(data).where(eq(coreEvent.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteEvent(id: string) {
  return db.transaction(async (tx) => {
    // Delete in reverse dependency order to avoid foreign key restrict conflicts
    await tx.delete(coreSolve).where(eq(coreSolve.eventId, id));
    await tx.delete(coreSubmission).where(eq(coreSubmission.eventId, id));
    await tx.delete(coreHintUnlock).where(eq(coreHintUnlock.eventId, id));
    await tx.delete(coreHint).where(eq(coreHint.eventId, id));
    await tx.delete(szSkip).where(eq(szSkip.eventId, id));
    await tx.delete(szTeamPath).where(eq(szTeamPath.eventId, id));
    await tx.delete(szUnlockedChallenge).where(eq(szUnlockedChallenge.eventId, id));
    await tx.delete(szChallengePrereq).where(eq(szChallengePrereq.eventId, id));
    await tx.delete(szPathChallenge).where(eq(szPathChallenge.eventId, id));
    await tx.delete(szConvergenceFragment).where(eq(szConvergenceFragment.eventId, id));
    await tx.delete(szPath).where(eq(szPath.eventId, id));
    await tx.delete(szTimeGlitch).where(eq(szTimeGlitch.eventId, id));
    await tx.delete(coreChallenge).where(eq(coreChallenge.eventId, id));
    await tx.delete(coreTeamMember).where(eq(coreTeamMember.eventId, id));
    await tx.delete(coreTeam).where(eq(coreTeam.eventId, id));
    await tx.delete(coreEventUser).where(eq(coreEventUser.eventId, id));

    const rows = await tx.delete(coreEvent).where(eq(coreEvent.id, id)).returning();
    return rows[0] ?? null;
  });
}

export async function resetEventActivity(id: string) {
  return db.transaction(async (tx) => {
    await tx.delete(coreSolve).where(eq(coreSolve.eventId, id));
    await tx.delete(coreSubmission).where(eq(coreSubmission.eventId, id));
    await tx.delete(coreHintUnlock).where(eq(coreHintUnlock.eventId, id));
    await tx.delete(szSkip).where(eq(szSkip.eventId, id));
    await tx.delete(szTeamPath).where(eq(szTeamPath.eventId, id));
    return true;
  });
}

export async function getEventStats(id: string) {
  const [challenges, teams, solves, submissions] = await Promise.all([
    db.select({ count: count(), totalPoints: sql<number>`COALESCE(SUM(${coreChallenge.initialPoints}), 0)` })
      .from(coreChallenge)
      .where(eq(coreChallenge.eventId, id)),
    db.select({ count: count() })
      .from(coreTeam)
      .where(eq(coreTeam.eventId, id)),
    db.select({ count: count() })
      .from(coreSolve)
      .where(eq(coreSolve.eventId, id)),
    db.select({ count: count() })
      .from(coreSubmission)
      .where(eq(coreSubmission.eventId, id)),
  ]);

  return {
    challengesCount: Number(challenges[0]?.count ?? 0),
    totalPoints: Number(challenges[0]?.totalPoints ?? 0),
    teamsCount: Number(teams[0]?.count ?? 0),
    solvesCount: Number(solves[0]?.count ?? 0),
    submissionsCount: Number(submissions[0]?.count ?? 0),
  };
}
