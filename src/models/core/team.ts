import { boolean, check, foreignKey, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "@/models/shared/timestamp_audit";
import { coreEvent } from "@/models/core/event";
import { coreUser } from "@/models/core/user";

export const coreTeam = pgTable(
  "core_team",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => coreEvent.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isSolo: boolean("is_solo").notNull().default(false),
    joinCode: text("join_code").unique(), // NULL for solo teams — nothing to join
    createdByUser: uuid("created_by_user").references(() => coreUser.id, { onDelete: "set null" }),

    isHidden: boolean("is_hidden").notNull().default(false), // admins/test accounts
    disqualifiedAt: timestamp("disqualified_at", { withTimezone: true }),
    disqualifiedBy: uuid("disqualified_by").references(() => coreUser.id, { onDelete: "set null" }),
    disqualifiedReason: text("disqualified_reason"),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),

    ...timestamps,
  },
  (table) => [
    check(
      "core_team_disqualified_reason_check",
      sql`${table.disqualifiedAt} IS NULL OR ${table.disqualifiedReason} IS NOT NULL`,
    ),
    unique().on(table.eventId, table.name),
    unique().on(table.id, table.eventId), // composite-FK target
  ],
);
