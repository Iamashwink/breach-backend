import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events } from "@/schema/dao/events";
import { timeGlitchState } from "@/schema/dao/time-glitch";

export async function getAllActiveEvents() {
  return db.select().from(events).where(eq(events.status, "active"));
}

export async function getAllEvents() {
  return db.select().from(events);
}

export async function findEventById(id: string) {
  const rows = await db.select().from(events).where(eq(events.id, id));
  return rows[0] ?? null;
}

export async function findEventBySlug(slug: string) {
  const rows = await db.select().from(events).where(eq(events.slug, slug));
  return rows[0] ?? null;
}

export async function createEvent(data: {
  name: string;
  slug: string;
  maxTeamSize?: number;
  pathSwitchPenalty?: number;
  startsAt?: Date;
  endsAt?: Date;
}) {
  return db.transaction(async (tx) => {
    const [event] = await tx.insert(events).values(data).returning();
    await tx.insert(timeGlitchState).values({ eventId: event.id });
    return event;
  });
}

export async function updateEvent(
  id: string,
  data: Partial<{
    name: string;
    status: "draft" | "active" | "archived";
    maxTeamSize: number;
    pathSwitchPenalty: number;
    startsAt: Date;
    endsAt: Date;
  }>
) {
  const rows = await db.update(events).set(data).where(eq(events.id, id)).returning();
  return rows[0] ?? null;
}
