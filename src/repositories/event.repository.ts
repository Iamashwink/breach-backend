import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { coreEvent } from "@/models/core/event";

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
    startsAt: Date;
    endsAt: Date;
    isPublished: boolean;
    isFrozen: boolean;
    frozenAt: Date | null;
    updatedBy: string;
  }>,
) {
  const rows = await db.update(coreEvent).set(data).where(eq(coreEvent.id, id)).returning();
  return rows[0] ?? null;
}
