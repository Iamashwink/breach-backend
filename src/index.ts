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
  .use(cors({ origin: env.FRONTEND_URL, credentials: true }))
  .use(router)
  .get("/", () => ({ status: "ok" }))
  .listen(env.PORT);

logger.info(`Server listening on http://localhost:${env.PORT}`);

export type App = typeof app;
