import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { events } from "./events";
import { profiles } from "./profiles";

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
