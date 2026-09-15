import { check, foreignKey, index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authorship } from "@/models/shared/authorship";
import { timestamps } from "@/models/shared/timestamp_audit";
import { coreChallenge } from "@/models/core/challenge";
import { coreEvent } from "@/models/core/event";

export const szChallengePrereq = pgTable(
  "sz_challenge_prereq",
  {
    eventId: uuid("event_id").notNull(),
    challengeId: uuid("challenge_id").notNull(),
    requiresId: uuid("requires_id").notNull(),

    ...timestamps,
    ...authorship,
  },
  (table) => [
    primaryKey({ columns: [table.challengeId, table.requiresId] }),
    check("sz_challenge_prereq_not_self", sql`${table.challengeId} <> ${table.requiresId}`),
    foreignKey({ columns: [table.eventId], foreignColumns: [coreEvent.id] }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.challengeId],
      foreignColumns: [coreChallenge.eventId, coreChallenge.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.eventId, table.requiresId],
      foreignColumns: [coreChallenge.eventId, coreChallenge.id],
    }).onDelete("cascade"),
    // "What does solving X unlock" — the reverse of the PK.
    index("sz_challenge_prereq_requires_idx").on(table.requiresId),
  ],
);
