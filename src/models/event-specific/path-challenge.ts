import { boolean, check, foreignKey, pgTable, smallint, text, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authorship } from "@/models/shared/authorship";
import { timestamps } from "@/models/shared/timestamp_audit";
import { szFragmentKey, szTier } from "@/models/event-specific/custom-types";
import { coreChallenge } from "@/models/core/challenge";
import { coreEvent } from "@/models/core/event";
import { szPath } from "@/models/event-specific/path";

export const szPathChallenge = pgTable(
  "sz_path_challenge",
  {
    challengeId: uuid("challenge_id").primaryKey(),
    eventId: uuid("event_id").notNull(),
    pathId: uuid("path_id").notNull(),
    sequence: smallint("sequence").notNull(),
    tier: szTier("tier").notNull(),
    preStory: text("pre_story").notNull(),
    postStory: text("post_story").notNull(),
    gmNote: text("gm_note"), // e.g. A10's "unlock after A3+A7"
    isPathFinal: boolean("is_path_final").notNull().default(false), // A10/B10/C10
    fragmentKey: szFragmentKey("fragment_key"),

    ...timestamps,
    ...authorship,
  },
  (table) => [
    check("sz_path_challenge_sequence_check", sql`${table.sequence} > 0`),
    // Only the path's final challenge hands out a fragment.
    check(
      "sz_path_challenge_fragment_final_check",
      sql`${table.fragmentKey} IS NULL OR ${table.isPathFinal}`,
    ),
    foreignKey({ columns: [table.eventId], foreignColumns: [coreEvent.id] }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.challengeId],
      foreignColumns: [coreChallenge.eventId, coreChallenge.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.pathId],
      foreignColumns: [szPath.eventId, szPath.id],
    }).onDelete("cascade"),
    unique().on(table.pathId, table.sequence),
  ],
);
