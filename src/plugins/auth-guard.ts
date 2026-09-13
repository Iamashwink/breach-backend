import { Elysia } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { jwtPlugin } from "./jwt";
import { UnauthorizedError } from "@/errors/error-types";

export const authGuard = new Elysia({ name: "auth-guard" })
  .use(jwtPlugin)
  .use(bearer())
  .derive({ as: "global" }, async ({ jwt, bearer }) => {
    if (!bearer) throw new UnauthorizedError("Missing token");
    const payload = await jwt.verify(bearer);
    if (!payload) throw new UnauthorizedError("Invalid or expired token");
    return {
      user: { id: payload.sub as string, role: payload.role as string },
    };
  });
