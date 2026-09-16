import {
  findAllEvents,
  findPublishedEvents,
  findEventById,
  findEventBySlug,
  createEvent,
  updateEvent,
} from "@/repositories/event.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/errors/error-types";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function listEvents(isAdmin: boolean) {
  return isAdmin ? findAllEvents() : findPublishedEvents();
}

export async function createNewEvent(body: {
  name: string;
  slug?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  createdBy: string;
}) {
  const slug = body.slug ?? slugify(body.name);
  const existing = await findEventBySlug(slug);
  if (existing) throw new ConflictError(`Slug "${slug}" is already in use`);

  return createEvent({
    name: body.name,
    slug,
    description: body.description,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    createdBy: body.createdBy,
  });
}

/**
 * Absent means "leave alone"; an explicit null means "clear it". Drizzle drops
 * `undefined` keys from `.set()`, so the two have to be told apart before they
 * get there — otherwise a date can be set but never unset.
 */
function parseNullableDate(value: string | null | undefined, field: string) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new ValidationError(`${field} must be a valid timestamp`);
  return parsed;
}

export async function patchEvent(
  eventId: string,
  body: {
    name?: string;
    description?: string;
    startsAt?: string | null;
    endsAt?: string | null;
    isPublished?: boolean;
    isFrozen?: boolean;
    updatedBy: string;
  },
) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");

  const startsAt = parseNullableDate(body.startsAt, "startsAt");
  const endsAt = parseNullableDate(body.endsAt, "endsAt");

  // Validate the state the row will actually be in, not just what this request
  // names — clearing a date on an already-published event would otherwise sail
  // past here and die on core_event_published_has_window_check as a raw 500.
  const effectiveStart = startsAt === undefined ? event.startsAt : startsAt;
  const effectiveEnd = endsAt === undefined ? event.endsAt : endsAt;
  const willBePublished = body.isPublished ?? event.isPublished;

  if (willBePublished && (!effectiveStart || !effectiveEnd))
    throw new ValidationError("Cannot publish event without startsAt and endsAt");
  if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart)
    throw new ValidationError("endsAt must be after startsAt");

  const data: Parameters<typeof updateEvent>[1] = {
    name: body.name,
    description: body.description,
    startsAt,
    endsAt,
    isPublished: body.isPublished,
    updatedBy: body.updatedBy,
  };

  if (body.isFrozen !== undefined) {
    data.isFrozen = body.isFrozen;
    data.frozenAt = body.isFrozen ? new Date() : null;
  }

  return updateEvent(eventId, data);
}
