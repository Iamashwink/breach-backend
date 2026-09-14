import { Elysia } from "elysia";
import { authRoutes } from "@/routes/auth/auth.routes";
import { eventRoutes, adminEventRoutes } from "@/routes/events/event.routes";
import { teamRoutes } from "@/routes/teams/team.routes";
import { leaderboardRoutes } from "@/routes/leaderboard/leaderboard.routes";
import { categoryRoutes, adminCategoryRoutes } from "@/routes/categories/category.routes";

export const router = new Elysia()
  .use(authRoutes)
  .use(eventRoutes)
  .use(adminEventRoutes)
  .use(teamRoutes)
  .use(leaderboardRoutes)
  .use(categoryRoutes)
  .use(adminCategoryRoutes)

