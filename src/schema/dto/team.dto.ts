import { t } from "elysia";

export const createTeamBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 50 }),
});

export const joinTeamBody = t.Object({
  name: t.String({ minLength: 1 }),
  joinCode: t.String({ minLength: 1 }),
});
