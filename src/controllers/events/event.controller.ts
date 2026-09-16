import * as eventService from "@/services/events/event.service";

export async function list(isAdmin: boolean) {
  return eventService.listEvents(isAdmin);
}

export async function create(
  body: {
    name: string;
    slug?: string;
    description?: string;
    startsAt?: string;
    endsAt?: string;
  },
  createdBy: string,
) {
  return eventService.createNewEvent({ ...body, createdBy });
}

export async function patch(
  eventId: string,
  body: {
    name?: string;
    description?: string;
    startsAt?: string | null;
    endsAt?: string | null;
    isPublished?: boolean;
    isFrozen?: boolean;
  },
  updatedBy: string,
) {
  return eventService.patchEvent(eventId, { ...body, updatedBy });
}
