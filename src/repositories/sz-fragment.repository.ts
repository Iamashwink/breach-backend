import { and, eq } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { szConvergenceFragment } from "@/models/event-specific/convergence-fragment";
import type { SzFragmentKey } from "@/models/event-specific/custom-types";

export async function findFragmentsByTeam(
  teamId: string,
  eventId: string,
  executor: Executor = db,
) {
  return executor
    .select()
    .from(szConvergenceFragment)
    .where(
      and(
        eq(szConvergenceFragment.teamId, teamId),
        eq(szConvergenceFragment.eventId, eventId),
      ),
    );
}

export async function createFragment(
  data: {
    eventId: string;
    teamId: string;
    fragmentKey: SzFragmentKey;
    challengeId: string;
  },
  executor: Executor = db,
) {
  const rows = await executor
    .insert(szConvergenceFragment)
    .values(data)
    .onConflictDoNothing()
    .returning();
  return rows[0] ?? null;
}
