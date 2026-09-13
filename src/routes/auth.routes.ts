import { Elysia, t } from "elysia";
import { jwtPlugin } from "@/plugins/jwt";
import { authGuard } from "@/plugins/auth-guard";
import { signup, login, me } from "@/controllers/auth.controller";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)
  .post("/signup", signup, {
    body: t.Object({
      username: t.String({ minLength: 3, maxLength: 32 }),
      email: t.String({ format: "email" }),
      password: t.String({ minLength: 8 }),
    }),
  })
  .post("/login", login, {
    body: t.Object({
      email: t.String({ format: "email" }),
      password: t.String(),
    }),
  })
  .use(authGuard)
  .get("/me", me);
