import Elysia, { t } from "elysia";
import { authGuard, adminGuard } from "@/middlewares/auth-guard";
import { handleCreateTeam, handleGetMyTeam, handleJoinTeam } from "@/controllers/teams/team.controller";
import { createTeamBody, joinTeamBody } from "@/schema/dto/team.dto";
import {
  findAllTeamsByEvent,
  updateTeam,
  deleteTeam,
  findRecentSubmissions,
} from "@/repositories/team.repository";

const eventParams = t.Object({ eventId: t.String() });
const teamParams = t.Object({ eventId: t.String(), teamId: t.String() });

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

export const adminTeamRoutes = new Elysia()
  .use(adminGuard)
  .get(
    "/admin/events/:eventId/teams",
    ({ params }) => findAllTeamsByEvent(params.eventId),
    { params: eventParams },
  )
  .patch(
    "/admin/events/:eventId/teams/:teamId",
    ({ params, body, user }) => updateTeam(params.teamId, params.eventId, body, user.id),
    {
      params: teamParams,
      body: t.Object({
        banned: t.Optional(t.Boolean()),
        disqualified: t.Optional(t.Boolean()),
        reason: t.Optional(t.String()),
        name: t.Optional(t.String()),
        isHidden: t.Optional(t.Boolean()),
      }),
    },
  )
  .delete(
    "/admin/events/:eventId/teams/:teamId",
    ({ params }) => deleteTeam(params.teamId, params.eventId),
    { params: teamParams },
  )
  .get(
    "/admin/events/:eventId/submissions",
    ({ params, query }) => findRecentSubmissions(params.eventId, query.limit ? Number(query.limit) : 50),
    {
      params: eventParams,
      query: t.Optional(t.Object({ limit: t.Optional(t.String()) })),
    },
  );

