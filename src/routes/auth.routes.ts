import Elysia from "elysia";
import { signup, login } from "@/controllers/auth.controller";
import { findProfileById } from "@/models/profile.model";
import { authGuard } from "@/middlewares/auth-guard";
import { signupBody, loginBody } from "@/schema/dto/auth.dto";
import { NotFoundError } from "@/errors/error-types";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post("/signup", ({ body }) => signup(body), { body: signupBody })
  .post("/login", ({ body }) => login(body), { body: loginBody })
  .use(authGuard)
  .get("/me", async ({ user }) => {
    const profile = await findProfileById(user.id);
    if (!profile) throw new NotFoundError();
    return { id: profile.id, username: profile.username, role: profile.role };
  });
