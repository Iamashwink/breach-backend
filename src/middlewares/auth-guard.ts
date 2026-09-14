import Elysia from "elysia";
import { verifyToken } from "@/services/auth/token.service";
import { AppError, ForbiddenError, UnauthorizedError } from "@/errors/error-types";

/**
 * Verifies the `Authorization: Bearer <token>` header and derives `user` for
 * downstream handlers. Apply to a route group with `.use(authGuard)`.
 */
export const authGuard = new Elysia({ name: "auth-guard" }).derive(
  { as: "scoped" },
  async ({ headers }) => {
    const auth = headers["authorization"];
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedError("Missing token");

    try {
      const payload = await verifyToken(auth.slice("Bearer ".length));
      return { user: { id: payload.sub, isAdmin: payload.isAdmin } };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new UnauthorizedError("Invalid or expired token");
    }
  },
);

/** Same as `authGuard`, plus requires `user.isAdmin`. */
export const adminGuard = new Elysia({ name: "admin-guard" })
  .use(authGuard)
  .derive({ as: "scoped" }, (context) => {
    if (!context.user?.isAdmin) throw new ForbiddenError();
    return {};
  });
