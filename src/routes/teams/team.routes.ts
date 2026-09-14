import Elysia, { t } from "elysia";
import { authGuard } from "@/middlewares/auth-guard";
import { handleCreateTeam, handleGetMyTeam, handleJoinTeam } from "@/controllers/teams/team.controller";
import { createTeamBody, joinTeamBody } from "@/schema/dto/team.dto";

const eventParams = t.Object({ eventId: t.String() });

export const teamRoutes = new Elysia()
  .use(authGuard)
  .post(
    "/events/:eventId/teams",
    ({ params, body, user }) => handleCreateTeam(user.id, params.eventId, body.name),
    { params: eventParams, body: createTeamBody },
  )
  .post(
    "/events/:eventId/teams/join",
    ({ params, body, user }) => handleJoinTeam(user.id, params.eventId, body.name, body.joinCode),
    { params: eventParams, body: joinTeamBody },
  )
  .get(
    "/events/:eventId/teams/me",
    ({ params, user }) => handleGetMyTeam(user.id, params.eventId),
    { params: eventParams },
  );
