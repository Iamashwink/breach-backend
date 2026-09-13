import { Elysia } from "elysia";
import { authRoutes } from "@/routes/auth.routes";
import { eventRoutes, adminEventRoutes } from "@/routes/event.routes";

export const router = new Elysia()
  .use(authRoutes)
  .use(eventRoutes)
  .use(adminEventRoutes);
