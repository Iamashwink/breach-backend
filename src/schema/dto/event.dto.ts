import { t } from "elysia";

export const createEventBody = t.Object({
  name: t.String({ minLength: 1 }),
  slug: t.Optional(t.String({ minLength: 1 })),
  maxTeamSize: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
  pathSwitchPenalty: t.Optional(t.Number({ minimum: 0 })),
  startsAt: t.Optional(t.String()),
  endsAt: t.Optional(t.String()),
});

export const updateEventBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  status: t.Optional(t.Union([t.Literal("draft"), t.Literal("active"), t.Literal("archived")])),
  maxTeamSize: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
  pathSwitchPenalty: t.Optional(t.Number({ minimum: 0 })),
  startsAt: t.Optional(t.String()),
  endsAt: t.Optional(t.String()),
});
