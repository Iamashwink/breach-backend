import { and, asc, eq } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { coreChallenge } from "@/models/core/challenge";
import { coreHint } from "@/models/core/hint";
import { coreHintUnlock } from "@/models/core/hint-unlock";

/**
 * Every column a player may see. `flagHash` is deliberately absent: the hashes
 * are unsalted sha256 of the flag text, so handing one to a player is handing
 * them an offline-crackable copy of the flag. Anything player-facing selects
 * this set rather than `select()`.
 */
const playerChallengeColumns = {
  id: coreChallenge.id,
  eventId: coreChallenge.eventId,
  title: coreChallenge.title,
  description: coreChallenge.description,
  categoryId: coreChallenge.categoryId,
  difficulty: coreChallenge.difficulty,
  initialPoints: coreChallenge.initialPoints,
  minPoints: coreChallenge.minPoints,
  decayThreshold: coreChallenge.decayThreshold,
  decayType: coreChallenge.decayType,
  state: coreChallenge.state,
  maxAttempts: coreChallenge.maxAttempts,
  author: coreChallenge.author,
  resourceLink: coreChallenge.resourceLink,
  createdAt: coreChallenge.createdAt,
  updatedAt: coreChallenge.updatedAt,
};

/**
 * Ordered so that callers which take "the first matching row" — notably
 * `findWelcomeChallenge` — are deterministic. Postgres gives no order
 * guarantee without an ORDER BY, so without this the welcome challenge could
 * differ between two calls in the same request.
 */
export async function findChallengesByEvent(eventId: string, executor: Executor = db) {
  return executor
    .select()
    .from(coreChallenge)
    .where(eq(coreChallenge.eventId, eventId))
    .orderBy(asc(coreChallenge.createdAt), asc(coreChallenge.id));
}

export async function findVisibleChallengesByEvent(eventId: string, executor: Executor = db) {
  return executor
    .select(playerChallengeColumns)
    .from(coreChallenge)
    .where(and(eq(coreChallenge.eventId, eventId), eq(coreChallenge.state, "visible")))
    .orderBy(asc(coreChallenge.createdAt), asc(coreChallenge.id));
}

export async function findChallengeById(
  challengeId: string,
  eventId: string,
  executor: Executor = db,
) {
  const rows = await executor
    .select()
    .from(coreChallenge)
    .where(and(eq(coreChallenge.id, challengeId), eq(coreChallenge.eventId, eventId)));
  return rows[0] ?? null;
}

/**
 * The challenge row, locked for the rest of the caller's transaction.
 *
 * Dynamic scoring and first-blood ordering both answer "how many solves does
 * this challenge have", read it, and then write a row keyed on the answer.
 * Without this lock two teams solving at the same instant read the same count,
 * compute the same `solve_order`, and the second INSERT dies on
 * `core_solve_challenge_order_uq` — taking its submission row down with it.
 */
export async function lockChallengeForUpdate(
  challengeId: string,
  eventId: string,
  executor: Executor = db,
) {
  const rows = await executor
    .select()
    .from(coreChallenge)
    .where(and(eq(coreChallenge.id, challengeId), eq(coreChallenge.eventId, eventId)))
    .for("update");
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

export async function findHintsByChallenge(challengeId: string, executor: Executor = db) {
  return executor
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
