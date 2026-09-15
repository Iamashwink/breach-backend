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
  description: t.Optional(t.String()),
  startsAt: t.Optional(t.String()),
  endsAt: t.Optional(t.String()),
  isPublished: t.Optional(t.Boolean()),
  isFrozen: t.Optional(t.Boolean()),
});
