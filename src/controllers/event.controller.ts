import {
  getAllActiveEvents,
  getAllEvents,
  findEventById,
  findEventBySlug,
  createEvent,
  updateEvent,
} from "@/models/event.model";
import { slugify, isValidStatusTransition } from "@/services/event.service";
import { ConflictError, NotFoundError, ValidationError } from "@/errors/error-types";

export async function listEvents(isAdmin: boolean) {
  return isAdmin ? getAllEvents() : getAllActiveEvents();
}

export async function createNewEvent(body: {
  name: string;
  slug?: string;
  maxTeamSize?: number;
  pathSwitchPenalty?: number;
  startsAt?: string;
  endsAt?: string;
}) {
  const slug = body.slug ?? slugify(body.name);

  const existing = await findEventBySlug(slug);
  if (existing) throw new ConflictError(`Slug "${slug}" is already in use`);

  return createEvent({
    name: body.name,
    slug,
    maxTeamSize: body.maxTeamSize,
    pathSwitchPenalty: body.pathSwitchPenalty,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
  });
}

export async function patchEvent(
  eventId: string,
  body: {
    name?: string;
    status?: "draft" | "active" | "archived";
    maxTeamSize?: number;
    pathSwitchPenalty?: number;
    startsAt?: string;
    endsAt?: string;
  }
) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");

  if (body.status) {
    const valid = isValidStatusTransition(event.status, body.status);
    if (!valid)
      throw new ValidationError(
        `Cannot transition status from "${event.status}" to "${body.status}"`
      );
  }

  return updateEvent(eventId, {
    name: body.name,
    status: body.status,
    maxTeamSize: body.maxTeamSize,
    pathSwitchPenalty: body.pathSwitchPenalty,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
  });
}
