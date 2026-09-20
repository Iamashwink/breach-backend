import { Elysia } from "elysia";
import { authRoutes } from "@/routes/auth/auth.routes";
import { eventRoutes, adminEventRoutes } from "@/routes/events/event.routes";
import { teamRoutes, adminTeamRoutes } from "@/routes/teams/team.routes";
import { leaderboardRoutes } from "@/routes/leaderboard/leaderboard.routes";
import { categoryRoutes, adminCategoryRoutes } from "@/routes/categories/category.routes";
import { challengeRoutes, adminChallengeRoutes } from "@/routes/challenges/challenge.routes";
import { signalZeroRoutes, adminSignalZeroRoutes } from "@/routes/signal-zero/signal-zero.routes";

export const router = new Elysia()
  .use(authRoutes)
  .use(eventRoutes)
  .use(adminEventRoutes)
  .use(teamRoutes)
  .use(adminTeamRoutes)
  .use(leaderboardRoutes)
  .use(categoryRoutes)
  .use(adminCategoryRoutes)
  .use(challengeRoutes)
  .use(adminChallengeRoutes)
  .use(signalZeroRoutes)
  .use(adminSignalZeroRoutes);

