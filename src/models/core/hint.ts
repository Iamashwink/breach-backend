import { check, foreignKey, integer, pgTable, smallint, text, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authorship } from "@/models/shared/authorship";
import { timestamps } from "@/models/shared/timestamp_audit";
import { coreChallenge } from "@/models/core/challenge";
import { coreEvent } from "@/models/core/event";

/**
 * Scoped hint. Cost is deducted from the team's score on unlock
 * (see core_hint_unlock). `requiresHintId` supports tiered hints, e.g. hint 2
 * only purchasable after hint 1.
 *
 * `requiresHintId` is a plain single-column self-reference. The previous
 * three-column version tried to enforce "the prerequisite is on the same
 * challenge" inside the FK, but its ON DELETE SET NULL would have tried to
 * null `event_id` and `challenge_id` too — both NOT NULL — so deleting any
 * depended-on hint raised 23502 instead of clearing the link. The
 * same-challenge rule now lives in the hint service.
 */
export const coreHint = pgTable(
  "core_hint",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull(),
    challengeId: uuid("challenge_id").notNull(),
    body: text("body").notNull(),
    cost: integer("cost").notNull().default(0),
    sortOrder: smallint("sort_order").notNull().default(0),
    requiresHintId: uuid("requires_hint_id"),

    ...timestamps,
    ...authorship,
  },
  (table) => [
    check("core_hint_cost_check", sql`${table.cost} >= 0`),
    check("core_hint_sort_order_check", sql`${table.sortOrder} >= 0`),
    check("core_hint_not_self_check", sql`${table.requiresHintId} IS NULL OR ${table.requiresHintId} <> ${table.id}`),
    foreignKey({ columns: [table.eventId], foreignColumns: [coreEvent.id] }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.challengeId],
      foreignColumns: [coreChallenge.eventId, coreChallenge.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.requiresHintId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    unique().on(table.id, table.eventId), // composite-FK target
    unique().on(table.challengeId, table.sortOrder),
  ],
);
