import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { szTimeGlitch } from "@/models/event-specific/time-glitch";

/**
 * The glitch window covering `at`, if any. Solving inside one scores at
 * initial_points instead of the decayed value.
 */
export async function findActiveGlitch(eventId: string, at: Date, executor: Executor = db) {
  const rows = await executor
    .select()
    .from(szTimeGlitch)
    .where(
      and(
        eq(szTimeGlitch.eventId, eventId),
        lte(szTimeGlitch.startsAt, at),
        gte(szTimeGlitch.endsAt, at),
      ),
    );
  return rows[0] ?? null;
}

export async function findGlitchesByEvent(eventId: string, executor: Executor = db) {
  return executor
    .select()
    .from(szTimeGlitch)
    .where(eq(szTimeGlitch.eventId, eventId))
    .orderBy(asc(szTimeGlitch.startsAt));
}

export async function findUpcomingGlitches(eventId: string, after: Date) {
  return db
    .select()
    .from(szTimeGlitch)
    .where(and(eq(szTimeGlitch.eventId, eventId), gte(szTimeGlitch.endsAt, after)))
    .orderBy(asc(szTimeGlitch.startsAt));
}

export async function createGlitch(
  data: {
    eventId: string;
    label?: string;
    startsAt: Date;
    endsAt: Date;
    createdBy?: string;
  },
  executor: Executor = db,
) {
  const rows = await executor.insert(szTimeGlitch).values(data).returning();
  return rows[0]!;
}

/** Bulk insert for the generated schedule, so a partial schedule is impossible. */
export async function createGlitches(
  rows: { eventId: string; label?: string; startsAt: Date; endsAt: Date; createdBy?: string }[],
  executor: Executor = db,
) {
  if (rows.length === 0) return [];
  return executor.insert(szTimeGlitch).values(rows).returning();
}

export async function deleteGlitch(glitchId: string, eventId: string) {
  const rows = await db
    .delete(szTimeGlitch)
    .where(and(eq(szTimeGlitch.id, glitchId), eq(szTimeGlitch.eventId, eventId)))
    .returning();
  return rows[0] ?? null;
}
