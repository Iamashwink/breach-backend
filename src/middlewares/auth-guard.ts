import Elysia from "elysia";
import { verifyToken } from "@/services/auth.service";
import { UnauthorizedError, ForbiddenError, AppError } from "@/errors/error-types";

export const authGuard = new Elysia().derive(
  { as: "scoped" },
  async ({ headers }) => {
    const auth = headers["authorization"];
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedError();
    try {
      const payload = await verifyToken(auth.slice(7));
      return { user: { id: payload.sub, role: payload.role } };
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new UnauthorizedError();
    }
  }
);

export const adminGuard = new Elysia().derive(
  { as: "scoped" },
  async ({ headers }) => {
    const auth = headers["authorization"];
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedError();
    try {
      const payload = await verifyToken(auth.slice(7));
      if (payload.role !== "admin") throw new ForbiddenError();
      return { user: { id: payload.sub, role: payload.role } };
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new UnauthorizedError();
    }
  }
);
