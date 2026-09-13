import { pgTable, uuid, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { events } from "./events";

export const timeGlitchState = pgTable("time_glitch_state", {
  eventId: uuid("event_id").primaryKey().references(() => events.id),
  isActive: boolean("is_active").default(false).notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds").default(600).notNull(),
  intervalSeconds: integer("interval_seconds").default(3600).notNull(),
});
