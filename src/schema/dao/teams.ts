import { pgTable, uuid, text, integer, boolean, timestamp, primaryKey, unique } from "drizzle-orm/pg-core";
import { events } from "./events";
import { profiles } from "./profiles";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  name: text("name").notNull(),
  joinCode: text("join_code").unique().notNull(),
  activePath: text("active_path", { enum: ["A", "B", "C"] }),
  pathSwitchCount: integer("path_switch_count").default(0).notNull(),
  fragmentWho: boolean("fragment_who").default(false).notNull(),
  fragmentHow: boolean("fragment_how").default(false).notNull(),
  fragmentWhy: boolean("fragment_why").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique().on(t.eventId, t.name),
]);

export const teamMembers = pgTable("team_members", {
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  isLeader: boolean("is_leader").default(false).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.teamId, t.userId] }),
]);
