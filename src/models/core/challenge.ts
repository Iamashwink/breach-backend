import { check, index, integer, pgTable, smallint, text, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authorship } from "@/models/shared/authorship";
import { timestamps } from "@/models/shared/timestamp_audit";
import { challengeDifficulty, challengeState, decayType } from "@/models/core/custom-types";
import { coreCategory } from "@/models/core/category";
import { coreEvent } from "@/models/core/event";

/**
 * Pulling a broken challenge mid-event is `state = 'hidden'`, not a delete —
 * a delete would take its solves and submissions with it.
 */
export const coreChallenge = pgTable(
  "core_challenge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => coreEvent.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    categoryId: smallint("category_id")
      .notNull()
      .references(() => coreCategory.id),
    difficulty: challengeDifficulty("difficulty").notNull(),

    // Dynamic scoring
    initialPoints: integer("initial_points").notNull(),
    minPoints: integer("min_points").notNull(),
    decayThreshold: integer("decay_threshold").notNull().default(25), // solves until min_points
    decayType: decayType("decay_type").notNull().default("logarithmic"),
    flagHash: text("flag_hash").notNull(),

    state: challengeState("state").notNull().default("hidden"),
    maxAttempts: integer("max_attempts"), // NULL = unlimited
    author: text("author"),
    resourceLink: text("resource_link"),

    ...timestamps,
    ...authorship,
  },
  (table) => [
    check("core_challenge_flag_check", sql`${table.flagHash} <> ''`),
    check("core_challenge_points_check", sql`${table.initialPoints} > 0`),
    check("core_challenge_min_points_check", sql`${table.minPoints} > 0`),
    check("core_challenge_min_le_initial_check", sql`${table.minPoints} <= ${table.initialPoints}`),
    check("core_challenge_decay_threshold_check", sql`${table.decayThreshold} > 0`),
    check("core_challenge_max_attempts_check", sql`${table.maxAttempts} IS NULL OR ${table.maxAttempts} > 0`),
    unique().on(table.id, table.eventId),
    index("core_challenge_event_state_idx").on(table.eventId, table.state),
    index("core_challenge_category_idx").on(table.categoryId),
  ],
);
