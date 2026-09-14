import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { coreChallenge } from "@/models/core/challenge";
import { coreHint } from "@/models/core/hint";
import { coreHintUnlock } from "@/models/core/hint-unlock";

export async function findChallengesByEvent(eventId: string) {
  return db.select().from(coreChallenge).where(eq(coreChallenge.eventId, eventId));
}

export async function findVisibleChallengesByEvent(eventId: string) {
  return db
    .select()
    .from(coreChallenge)
    .where(and(eq(coreChallenge.eventId, eventId), eq(coreChallenge.state, "visible")));
}

export async function findChallengeById(challengeId: string, eventId: string) {
  const rows = await db
    .select()
    .from(coreChallenge)
    .where(and(eq(coreChallenge.id, challengeId), eq(coreChallenge.eventId, eventId)));
  return rows[0] ?? null;
}

export async function createChallenge(data: {
  eventId: string;
  title: string;
  description: string;
  categoryId: number;
  difficulty: "easy" | "medium" | "hard" | "expert";
  initialPoints: number;
  minPoints: number;
  decayThreshold?: number;
  decayType?: "logarithmic" | "linear" | "static";
  flagHash: string;
  maxAttempts?: number;
  author?: string;
  createdBy?: string;
}) {
  const rows = await db.insert(coreChallenge).values(data).returning();
  return rows[0]!;
}

export async function updateChallenge(
  challengeId: string,
  eventId: string,
  data: Partial<{
    title: string;
    description: string;
    categoryId: number;
    difficulty: "easy" | "medium" | "hard" | "expert";
    initialPoints: number;
    minPoints: number;
    decayThreshold: number;
    decayType: "logarithmic" | "linear" | "static";
    flagHash: string;
    state: "hidden" | "visible" | "locked";
    maxAttempts: number | null;
    author: string;
    updatedBy: string;
  }>,
) {
  const rows = await db
    .update(coreChallenge)
    .set(data)
    .where(and(eq(coreChallenge.id, challengeId), eq(coreChallenge.eventId, eventId)))
    .returning();
  return rows[0] ?? null;
}

export async function findHintsByChallenge(challengeId: string) {
  return db
    .select()
    .from(coreHint)
    .where(eq(coreHint.challengeId, challengeId))
    .orderBy(coreHint.sortOrder);
}

export async function findHintById(hintId: string, eventId: string) {
  const rows = await db
    .select()
    .from(coreHint)
    .where(and(eq(coreHint.id, hintId), eq(coreHint.eventId, eventId)));
  return rows[0] ?? null;
}

export async function createHint(data: {
  eventId: string;
  challengeId: string;
  body: string;
  cost?: number;
  sortOrder?: number;
  requiresHintId?: string;
  createdBy?: string;
}) {
  const rows = await db.insert(coreHint).values(data).returning();
  return rows[0]!;
}

export async function deleteHint(hintId: string, eventId: string) {
  const rows = await db
    .delete(coreHint)
    .where(and(eq(coreHint.id, hintId), eq(coreHint.eventId, eventId)))
    .returning();
  return rows[0] ?? null;
}

export async function findUnlockedHintsByTeam(teamId: string, eventId: string) {
  return db
    .select({ hintId: coreHintUnlock.hintId })
    .from(coreHintUnlock)
    .where(and(eq(coreHintUnlock.teamId, teamId), eq(coreHintUnlock.eventId, eventId)));
}

export async function findHintUnlock(teamId: string, hintId: string) {
  const rows = await db
    .select()
    .from(coreHintUnlock)
    .where(and(eq(coreHintUnlock.teamId, teamId), eq(coreHintUnlock.hintId, hintId)));
  return rows[0] ?? null;
}

export async function createHintUnlock(data: {
  teamId: string;
  hintId: string;
  eventId: string;
  costPaid: number;
  unlockedBy: string;
}) {
  const rows = await db.insert(coreHintUnlock).values(data).returning();
  return rows[0]!;
}
