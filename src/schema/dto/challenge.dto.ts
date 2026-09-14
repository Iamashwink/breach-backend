import { t } from "elysia";

export const createChallengeBody = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.String({ minLength: 1 }),
  categoryId: t.Number(),
  difficulty: t.Union([t.Literal("easy"), t.Literal("medium"), t.Literal("hard"), t.Literal("expert")]),
  initialPoints: t.Number({ minimum: 1 }),
  minPoints: t.Number({ minimum: 1 }),
  decayThreshold: t.Optional(t.Number({ minimum: 1 })),
  decayType: t.Optional(t.Union([t.Literal("logarithmic"), t.Literal("linear"), t.Literal("static")])),
  flag: t.String({ minLength: 1 }),
  maxAttempts: t.Optional(t.Number({ minimum: 1 })),
  author: t.Optional(t.String()),
});

export const updateChallengeBody = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  categoryId: t.Optional(t.Number()),
  difficulty: t.Optional(t.Union([t.Literal("easy"), t.Literal("medium"), t.Literal("hard"), t.Literal("expert")])),
  initialPoints: t.Optional(t.Number({ minimum: 1 })),
  minPoints: t.Optional(t.Number({ minimum: 1 })),
  decayThreshold: t.Optional(t.Number({ minimum: 1 })),
  decayType: t.Optional(t.Union([t.Literal("logarithmic"), t.Literal("linear"), t.Literal("static")])),
  flag: t.Optional(t.String({ minLength: 1 })),
  state: t.Optional(t.Union([t.Literal("hidden"), t.Literal("visible"), t.Literal("locked")])),
  maxAttempts: t.Optional(t.Nullable(t.Number({ minimum: 1 }))),
  author: t.Optional(t.String()),
});

export const createHintBody = t.Object({
  body: t.String({ minLength: 1 }),
  cost: t.Optional(t.Number({ minimum: 0 })),
  sortOrder: t.Optional(t.Number({ minimum: 0 })),
  requiresHintId: t.Optional(t.String()),
});

export const submitFlagBody = t.Object({
  flag: t.String({ minLength: 1 }),
});
