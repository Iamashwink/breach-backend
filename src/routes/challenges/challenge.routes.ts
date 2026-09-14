import Elysia, { t } from "elysia";
import { authGuard, adminGuard } from "@/middlewares/auth-guard";
import {
  handleCreateChallenge,
  handleCreateHint,
  handleDeleteHint,
  handleListChallengesAdmin,
  handleListChallengesPlayer,
  handleListHints,
  handleListHintsPlayer,
  handleSubmitFlag,
  handleUnlockHint,
  handleUpdateChallenge,
} from "@/controllers/challenges/challenge.controller";
import { createChallengeBody, createHintBody, submitFlagBody, updateChallengeBody } from "@/schema/dto/challenge.dto";

const eventParams = t.Object({ eventId: t.String() });
const challengeParams = t.Object({ eventId: t.String(), challengeId: t.String() });
const hintParams = t.Object({ eventId: t.String(), challengeId: t.String(), hintId: t.String() });

export const challengeRoutes = new Elysia()
  .use(authGuard)
  .get(
    "/events/:eventId/challenges",
    ({ params }) => handleListChallengesPlayer(params.eventId),
    { params: eventParams },
  )
  .get(
    "/events/:eventId/challenges/:challengeId/hints",
    ({ params, user }) => handleListHintsPlayer(params.challengeId, params.eventId, user.id),
    { params: challengeParams },
  )
  .post(
    "/events/:eventId/challenges/:challengeId/hints/:hintId/unlock",
    ({ params, user }) => handleUnlockHint(params.hintId, params.challengeId, params.eventId, user.id),
    { params: hintParams },
  )
  .post(
    "/events/:eventId/challenges/:challengeId/submit",
    ({ params, body, user }) => handleSubmitFlag(user.id, params.eventId, params.challengeId, body.flag),
    { params: challengeParams, body: submitFlagBody },
  );

export const adminChallengeRoutes = new Elysia()
  .use(adminGuard)
  .get(
    "/admin/events/:eventId/challenges",
    ({ params }) => handleListChallengesAdmin(params.eventId),
    { params: eventParams },
  )
  .post(
    "/admin/events/:eventId/challenges",
    ({ params, body, user }) => handleCreateChallenge(params.eventId, user.id, body),
    { params: eventParams, body: createChallengeBody },
  )
  .patch(
    "/admin/events/:eventId/challenges/:challengeId",
    ({ params, body, user }) => handleUpdateChallenge(params.challengeId, params.eventId, user.id, body),
    { params: challengeParams, body: updateChallengeBody },
  )
  .get(
    "/admin/events/:eventId/challenges/:challengeId/hints",
    ({ params }) => handleListHints(params.challengeId, params.eventId),
    { params: challengeParams },
  )
  .post(
    "/admin/events/:eventId/challenges/:challengeId/hints",
    ({ params, body, user }) => handleCreateHint(params.challengeId, params.eventId, user.id, body),
    { params: challengeParams, body: createHintBody },
  )
  .delete(
    "/admin/events/:eventId/challenges/:challengeId/hints/:hintId",
    ({ params }) => handleDeleteHint(params.hintId, params.eventId),
    { params: hintParams },
  );
