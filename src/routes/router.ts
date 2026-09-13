import { Elysia } from "elysia";

/**
 * Aggregates and registers all resource route modules into one Elysia
 * plugin. As resources are added, `.use()` their route module here, e.g.:
 *
 *   import { userRoutes } from "@/routes/user/user.routes";
 *   export const router = new Elysia().use(userRoutes);
 */
export const router = new Elysia();
