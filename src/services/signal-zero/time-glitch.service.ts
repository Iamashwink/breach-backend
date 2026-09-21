import { NotFoundError, ValidationError } from "@/errors/error-types";
import { findEventById } from "@/repositories/event.repository";
import {
  createGlitch,
  createGlitches,
  deleteAllGlitches,
  deleteGlitch,
  findActiveGlitch,
  findGlitchesByEvent,
  findUpcomingGlitches,
} from "@/repositories/sz-time-glitch.repository";

/**
 * Time Glitch windows are stored as explicit rows, not derived from an "every
 * hour on the hour" rule. Storing them means the scoring of any past solve
 * stays auditable after the fact — including if a window is shifted or
 * cancelled mid-event.
 */

export async function listGlitches(eventId: string) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");
  return findGlitchesByEvent(eventId);
}

/** What a player needs: is decay suspended right now, and when is the next one. */
export async function getGlitchStatus(eventId: string) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");

  const now = new Date();
  const [active, upcoming] = await Promise.all([
    findActiveGlitch(eventId, now),
    findUpcomingGlitches(eventId, now),
  ]);

  return {
    active: active ? { id: active.id, label: active.label, endsAt: active.endsAt } : null,
    next: upcoming.find((g) => g.startsAt > now) ?? null,
  };
}

export async function addGlitch(
  eventId: string,
  userId: string,
  body: { label?: string; startsAt: string; endsAt: string },
) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()))
    throw new ValidationError("startsAt and endsAt must be valid timestamps");
  if (endsAt <= startsAt) throw new ValidationError("endsAt must be after startsAt");

  const existing = await findGlitchesByEvent(eventId);
  const overlaps = existing.some((g) => startsAt < g.endsAt && endsAt > g.startsAt);
  if (overlaps) throw new ValidationError("This window overlaps an existing glitch");

  return createGlitch({ eventId, label: body.label, startsAt, endsAt, createdBy: userId });
}

/**
 * Generates the event's glitch schedule in one call — the rules doc describes
 * one roughly every hour, lasting about ten minutes, which is tedious to enter
 * by hand for a multi-hour event.
 */
export async function generateGlitchSchedule(
  eventId: string,
  userId: string,
  body: { everyMinutes?: number; durationMinutes?: number; firstAt?: string },
) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");
  if (!event.startsAt || !event.endsAt)
    throw new ValidationError("Event needs startsAt and endsAt before glitches can be scheduled");

  const every = body.everyMinutes ?? 60;
  const duration = body.durationMinutes ?? 10;
  if (duration >= every) throw new ValidationError("durationMinutes must be less than everyMinutes");

  const existing = await findGlitchesByEvent(eventId);
  if (existing.length > 0)
    throw new ValidationError("This event already has glitches — delete them first");

  const first = body.firstAt ? new Date(body.firstAt) : new Date(event.startsAt.getTime() + every * 60_000);
  if (Number.isNaN(first.getTime())) throw new ValidationError("firstAt must be a valid timestamp");

  // Built in full, then written in one statement. A loop of separate inserts
  // can stop halfway, and the "already has glitches" guard above would then
  // refuse to replace the partial schedule it left behind.
  const pending = [];
  let cursor = first;
  let n = 1;
  while (cursor.getTime() + duration * 60_000 <= event.endsAt.getTime()) {
    pending.push({
      eventId,
      label: `Glitch ${n}`,
      startsAt: cursor,
      endsAt: new Date(cursor.getTime() + duration * 60_000),
      createdBy: userId,
    });
    cursor = new Date(cursor.getTime() + every * 60_000);
    n += 1;
  }

  return createGlitches(pending);
}

export async function removeGlitch(glitchId: string, eventId: string) {
  const deleted = await deleteGlitch(glitchId, eventId);
  if (!deleted) throw new NotFoundError("Glitch not found");
  return deleted;
}

export async function removeAllGlitches(eventId: string) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");
  return deleteAllGlitches(eventId);
}
