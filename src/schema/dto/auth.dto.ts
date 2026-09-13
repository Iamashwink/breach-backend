import { t } from "elysia";

export const signupBody = t.Object({
  username: t.String({ minLength: 3, maxLength: 30 }),
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 8 }),
});

export const loginBody = t.Object({
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 1 }),
});
