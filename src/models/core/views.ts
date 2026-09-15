import { sql } from "drizzle-orm";
import { bigint, boolean, numeric, pgView, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Derived read models. Recomputed on every read, never written to directly.
 *
 * Both views carry `event_id` through every aggregate and GROUP BY it, so a
 * caller's `WHERE event_id = $1` is pushed down into the aggregation instead of
 * summing every solve in the database and filtering afterwards. Always query
 * these with an event predicate.
 *
 * Excluded from scoring: revoked solves, disqualified teams, hidden teams,
 * and challenges that are not `visible`.
 */

/**
 * Live solve count per challenge, feeding dynamic scoring. This runs on every
 * flag submission — promote to a counter column on `core_challenge` (updated in
 * the solve transaction) the moment it shows up in slow queries.
 */
export const coreChallengeSolveCount = pgView("core_challenge_solve_count", {
  eventId: uuid("event_id"),
  challengeId: uuid("challenge_id"),
  solves: bigint("solves", { mode: "number" }),
}).as(sql`
  SELECT
      c.event_id,
      c.id AS challenge_id,
      count(s.team_id) AS solves
  FROM core_challenge c
  LEFT JOIN core_solve s
      ON s.challenge_id = c.id
     AND s.revoked_at IS NULL
  GROUP BY c.event_id, c.id
`);

/**
 * SUM(points_awarded) − SUM(hint cost_paid), ranked, ties broken by earliest
 * last-solve.
 *
 * `is_frozen` is NOT applied here — a frozen board is a different question
 * ("the standings as of `frozen_at`"), so the service layer answers it with a
 * time-bounded query rather than this view silently changing meaning mid-event.
 */
export const coreLeaderboard = pgView("core_leaderboard", {
  eventId: uuid("event_id"),
  teamId: uuid("team_id"),
  displayName: text("display_name"),
  isSolo: boolean("is_solo"),
  score: numeric("score"),
  solveCount: bigint("solve_count", { mode: "number" }),
  lastSolveAt: timestamp("last_solve_at", { withTimezone: true }),
  rank: bigint("rank", { mode: "number" }),
}).as(sql`
  SELECT
      t.event_id,
      t.id AS team_id,
      t.name AS display_name,
      t.is_solo,
      coalesce(sv.total, 0) - coalesce(h.spent, 0) AS score,
      coalesce(sv.solve_count, 0) AS solve_count,
      sv.last_solve_at,
      rank() OVER (
          PARTITION BY t.event_id
          ORDER BY coalesce(sv.total, 0) - coalesce(h.spent, 0) DESC,
                   sv.last_solve_at ASC NULLS LAST
      ) AS rank
  FROM core_team t
  LEFT JOIN (
      SELECT s.event_id,
             s.team_id,
             sum(s.points_awarded) AS total,
             count(*) AS solve_count,
             max(s.solved_at) AS last_solve_at
      FROM core_solve s
      WHERE s.revoked_at IS NULL
      GROUP BY s.event_id, s.team_id
  ) sv ON sv.event_id = t.event_id AND sv.team_id = t.id
  LEFT JOIN (
      SELECT hu.event_id,
             hu.team_id,
             sum(hu.cost_paid) AS spent
      FROM core_hint_unlock hu
      GROUP BY hu.event_id, hu.team_id
  ) h ON h.event_id = t.event_id AND h.team_id = t.id
  WHERE t.is_hidden = FALSE
    AND t.disqualified_at IS NULL
`);
