import Elysia from "elysia";
import { login, me, signup } from "@/controllers/auth/auth.controller";
import { logger } from "@/loggers/logger";
import { authGuard } from "@/middlewares/auth-guard";
import { loginBody, signupBody } from "@/schema/dto/auth.dto";

async function signupRoute({ body, request, path }: { body: { username: string; email: string; password: string }; request: Request; path: string }) {
  const route = logger.child({ route: `${request.method} ${path}`, username: body.username });
  route.info("Route started");
  try {
    const result = await signup(body);
    route.info({ userId: result.user.id }, "Route succeeded");
    return result;
  } finally {
    route.info("Route ended");
  }
}

async function loginRoute({ body, request, path }: { body: { email: string; password: string }; request: Request; path: string }) {
  const route = logger.child({ route: `${request.method} ${path}`, email: body.email });
  route.info("Route started");
  try {
    const result = await login(body);
    route.info({ userId: result.user.id }, "Route succeeded");
    return result;
  } finally {
    route.info("Route ended");
  }
}

async function meRoute({ user, request, path }: { user: { id: string }; request: Request; path: string }) {
  const route = logger.child({ route: `${request.method} ${path}`, userId: user.id });
  route.info("Route started");
  try {
    const result = await me(user.id);
    route.info("Route succeeded");
    return result;
  } finally {
    route.info("Route ended");
  }
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post("/signup", signupRoute, { body: signupBody })
  .post("/login", loginRoute, { body: loginBody })
  .use(authGuard)
  .get("/me", meRoute);
