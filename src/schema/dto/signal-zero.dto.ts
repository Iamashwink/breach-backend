import { t } from "elysia";

export const selectPathBody = t.Object({
  pathId: t.String({ minLength: 1 }),
});

export const skipChallengeBody = t.Object({
  challengeId: t.String({ minLength: 1 }),
});

export const createGlitchBody = t.Object({
  label: t.Optional(t.String()),
  startsAt: t.String({ minLength: 1 }),
  endsAt: t.String({ minLength: 1 }),
});

export const generateGlitchesBody = t.Object({
  everyMinutes: t.Optional(t.Number({ minimum: 1 })),
  durationMinutes: t.Optional(t.Number({ minimum: 1 })),
  firstAt: t.Optional(t.String()),
});
