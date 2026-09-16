import Elysia, { t } from "elysia";
import { authGuard, adminGuard } from "@/middlewares/auth-guard";
import {
  handleCreateGlitch,
  handleDeleteGlitch,
  handleGenerateGlitches,
  handleGetBoard,
  handleGlitchStatus,
  handleListGlitches,
  handleListPaths,
  handleSelectPath,
  handleSkipChallenge,
  handleSwitchPath,
} from "@/controllers/signal-zero/signal-zero.controller";
import {
  createGlitchBody,
  generateGlitchesBody,
  selectPathBody,
  skipChallengeBody,
} from "@/schema/dto/signal-zero.dto";

const eventParams = t.Object({ eventId: t.String() });
const glitchParams = t.Object({ eventId: t.String(), glitchId: t.String() });

export const signalZeroRoutes = new Elysia()
  .use(authGuard)
  // The event page in one call: active path, exposed challenges, skips, glitch.
  .get(
    "/events/:eventId/board",
    ({ params, user }) => handleGetBoard(user.id, params.eventId),
    { params: eventParams },
  )
  .get(
    "/events/:eventId/paths",
    ({ params, user }) => handleListPaths(user.id, params.eventId),
    { params: eventParams },
  )
  .post(
    "/events/:eventId/paths/select",
    ({ params, body, user }) => handleSelectPath(user.id, params.eventId, body.pathId),
    { params: eventParams, body: selectPathBody },
  )
  .post(
    "/events/:eventId/paths/switch",
    ({ params, body, user }) => handleSwitchPath(user.id, params.eventId, body.pathId),
    { params: eventParams, body: selectPathBody },
  )
  .post(
    "/events/:eventId/skips",
    ({ params, body, user }) => handleSkipChallenge(user.id, params.eventId, body.challengeId),
    { params: eventParams, body: skipChallengeBody },
  )
  .get(
    "/events/:eventId/time-glitch",
    ({ params }) => handleGlitchStatus(params.eventId),
    { params: eventParams },
  );

export const adminSignalZeroRoutes = new Elysia()
  .use(adminGuard)
  .get(
    "/admin/events/:eventId/time-glitches",
    ({ params }) => handleListGlitches(params.eventId),
    { params: eventParams },
  )
  .post(
    "/admin/events/:eventId/time-glitches",
    ({ params, body, user }) => handleCreateGlitch(params.eventId, user.id, body),
    { params: eventParams, body: createGlitchBody },
  )
  .post(
    "/admin/events/:eventId/time-glitches/generate",
    ({ params, body, user }) => handleGenerateGlitches(params.eventId, user.id, body),
    { params: eventParams, body: generateGlitchesBody },
  )
  .delete(
    "/admin/events/:eventId/time-glitches/:glitchId",
    ({ params }) => handleDeleteGlitch(params.glitchId, params.eventId),
    { params: glitchParams },
  );
