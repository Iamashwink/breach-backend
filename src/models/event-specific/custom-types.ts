import { pgEnum } from "drizzle-orm/pg-core";

export const szTier = pgEnum("sz_tier", ["past", "present", "future"]);
export type SzTier = (typeof szTier.enumValues)[number];

export const szFragmentKey = pgEnum("sz_fragment_key", ["who", "how", "why"]);
export type SzFragmentKey = (typeof szFragmentKey.enumValues)[number];

export const szPathEntryReason = pgEnum("sz_path_entry_reason", [
  "initial",
  "free_switch",
  "penalized_switch",
]);
export type SzPathEntryReason = (typeof szPathEntryReason.enumValues)[number];

export const szUnlockSource = pgEnum("sz_unlock_source", [
  "initial",
  "solve",
  "skip",
  "prereq",
  "admin",
]);
export type SzUnlockSource = (typeof szUnlockSource.enumValues)[number];
