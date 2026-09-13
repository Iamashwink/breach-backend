import { pgTable, uuid, text, integer, boolean, unique } from "drizzle-orm/pg-core";
import { events } from "./events";
import { challenges } from "./challenges";

export const eventChallenges = pgTable("event_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  challengeId: uuid("challenge_id").references(() => challenges.id).notNull(),
  path: text("path", { enum: ["intro", "A", "B", "C"] }).notNull(),
  stage: text("stage", { enum: ["past", "present", "future"] }),
  orderIndex: integer("order_index").notNull(),
  unlocksAfter: uuid("unlocks_after").array().default([]).notNull(),
  isFinal: boolean("is_final").default(false).notNull(),
  initialPoints: integer("initial_points").default(500).notNull(),
  minPoints: integer("min_points").default(100).notNull(),
  decayStep: integer("decay_step").default(10).notNull(),
}, (t) => [
  unique().on(t.eventId, t.challengeId),
]);
