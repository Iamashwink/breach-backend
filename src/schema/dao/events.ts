import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  status: text("status", { enum: ["draft", "active", "archived"] }).default("draft").notNull(),
  maxTeamSize: integer("max_team_size").default(4).notNull(),
  pathSwitchPenalty: integer("path_switch_penalty").default(50).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
