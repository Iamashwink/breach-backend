import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { init } from "@/initializers/init";
import { env } from "@/initializers/load-env";
import { logger } from "@/loggers/logger";
import { errorHandler } from "@/middlewares/error-handler";
import { router } from "@/routes/router";

await init();

const app = new Elysia()
  .use(errorHandler)
  // Auth is a Bearer header, not a cookie, so credentials are not needed —-
  // and `credentials: true` with a wildcard origin is rejected by browsers.
  .use(cors({ origin: env.FRONTEND_URL }))
  .use(router)
  .get("/", () => ({ status: "ok" }))
  .listen({
    port: env.PORT,
    hostname: env.HOST,
  });

logger.info(`Server listening on http://${env.HOST}:${env.PORT}`);

export type App = typeof app;
