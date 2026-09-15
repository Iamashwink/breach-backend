import Elysia, { t } from "elysia";
import { authGuard } from "@/middlewares/auth-guard";
import { handleGetLeaderboard } from "@/controllers/leaderboard/leaderboard.controller";

export const leaderboardRoutes = new Elysia()
  .use(authGuard)
  .get(
    "/events/:eventId/scoreboard",
    ({ params }) => handleGetLeaderboard(params.eventId),
    { params: t.Object({ eventId: t.String() }) },
  );
