import { pgTable, uuid, integer, text, timestamp } from "drizzle-orm/pg-core";
import { events } from "./events";
import { teams } from "./teams";
import { profiles } from "./profiles";

export const pointAdjustments = pgTable("point_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id),
  teamId: uuid("team_id").references(() => teams.id),
  adminId: uuid("admin_id").references(() => profiles.id),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
