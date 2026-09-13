import Elysia, { t } from "elysia";
import { authGuard, adminGuard } from "@/middlewares/auth-guard";
import { listEvents, createNewEvent, patchEvent } from "@/controllers/event.controller";
import { createEventBody, updateEventBody } from "@/schema/dto/event.dto";

export const eventRoutes = new Elysia()
  .use(authGuard)
  .get("/events", ({ user }) => listEvents(user.role === "admin"));

export const adminEventRoutes = new Elysia()
  .use(adminGuard)
  .post("/admin/events", ({ body }) => createNewEvent(body), { body: createEventBody })
  .patch(
    "/admin/events/:eventId",
    ({ params, body }) => patchEvent(params.eventId, body),
    { body: updateEventBody, params: t.Object({ eventId: t.String() }) }
  );
