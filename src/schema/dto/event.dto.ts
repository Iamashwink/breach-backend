import { t } from "elysia";

export const createEventBody = t.Object({
  name: t.String({ minLength: 1 }),
  slug: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  startsAt: t.Optional(t.String()),
  endsAt: t.Optional(t.String()),
});

export const updateEventBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  slug: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  // Omit to leave unchanged, send null to clear. Clearing is what takes a
  // published event back to draft.
  startsAt: t.Optional(t.Union([t.String(), t.Null()])),
  endsAt: t.Optional(t.Union([t.String(), t.Null()])),
  isPublished: t.Optional(t.Boolean()),
  isFrozen: t.Optional(t.Boolean()),
});
