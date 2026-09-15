import Elysia, { t } from "elysia";
import { authGuard, adminGuard } from "@/middlewares/auth-guard";
import { list, create, patch } from "@/controllers/events/event.controller";
import { createEventBody, updateEventBody } from "@/schema/dto/event.dto";

export const eventRoutes = new Elysia()
  .use(authGuard)
  .get("/events", ({ user }) => list(user.isAdmin));

export const adminEventRoutes = new Elysia()
  .use(adminGuard)
  .post("/admin/events", ({ body, user }) => create(body, user.id), { body: createEventBody })
  .patch(
    "/admin/events/:eventId",
    ({ params, body, user }) => patch(params.eventId, body, user.id),
    { body: updateEventBody, params: t.Object({ eventId: t.String() }) },
  );
