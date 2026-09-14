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

export async function patchEvent(
  eventId: string,
  body: {
    name?: string;
    description?: string;
    startsAt?: string;
    endsAt?: string;
    isPublished?: boolean;
    isFrozen?: boolean;
    updatedBy: string;
  },
) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");

  if (body.isPublished) {
    const startsAt = body.startsAt ? new Date(body.startsAt) : event.startsAt;
    const endsAt = body.endsAt ? new Date(body.endsAt) : event.endsAt;
    if (!startsAt || !endsAt)
      throw new ValidationError("Cannot publish event without startsAt and endsAt");
  }

  const data: Parameters<typeof updateEvent>[1] = {
    name: body.name,
    description: body.description,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    isPublished: body.isPublished,
    updatedBy: body.updatedBy,
  };

  if (body.isFrozen !== undefined) {
    data.isFrozen = body.isFrozen;
    data.frozenAt = body.isFrozen ? new Date() : null;
  }

  return updateEvent(eventId, data);
}
