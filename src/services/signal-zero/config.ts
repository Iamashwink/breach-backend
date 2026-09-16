/**
 * Signal Zero's tunable rules, in one place.
 *
 * These are deliberately not CHECK constraints in the schema — "four skips",
 * "80%", "eight solves" are this event's balance, not facts about the data, and
 * retuning them mid-event should not require a migration.
 */

/** Skips allowed per team for the whole event (not per path attempt). */
export const SKIP_QUOTA = 4;

/** Multiplier applied after a skip, or after switching paths early. */
export const PENALTY_MULTIPLIER = "0.80";

export const FULL_MULTIPLIER = "1.00";

/** Solves in the active path that earn a free (unpenalised) path switch. */
export const FREE_SWITCH_THRESHOLD = 8;
