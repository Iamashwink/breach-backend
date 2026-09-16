import { findChallengesByEvent } from "@/repositories/challenge.repository";
import {
  findActiveTeamPath,
  findPathById,
  findPathChallenges,
  findSolvedChallengeIds,
} from "@/repositories/sz-path.repository";
import { countSkipsByTeam, findSkippedChallengeIds } from "@/repositories/sz-skip.repository";
import { findUnlockedChallengeIds } from "@/repositories/sz-reveal.repository";
import { findFragmentsByTeam } from "@/repositories/sz-fragment.repository";
import { findActiveGlitch, findUpcomingGlitches } from "@/repositories/sz-time-glitch.repository";
import { ensureCanScore } from "@/services/events/event-guard";
import { SKIP_QUOTA } from "@/services/signal-zero/config";
import { syncUnlocks } from "@/services/signal-zero/reveal.service";

/**
 * Everything the event page renders in one call: the team's active path, the
 * challenges currently exposed with their pre-story, what they've already
 * closed, their skips and multiplier, and the Time Glitch state.
 *
 * syncUnlocks runs first so a team that registered before the module was seeded
 * (or whose window was left short by an admin edit) is repaired on read rather
 * than needing a backfill.
 */
export async function getBoard(userId: string, eventId: string) {
  const { teamId } = await ensureCanScore(userId, eventId, "view the board");

  await syncUnlocks(teamId, eventId, "initial");

  const now = new Date();
  const [challenges, unlockedIds, solvedIds, skippedIds, activePath, fragments, glitch, upcoming, skipsUsed] =
    await Promise.all([
      findChallengesByEvent(eventId),
      findUnlockedChallengeIds(teamId, eventId),
      findSolvedChallengeIds(teamId, eventId),
      findSkippedChallengeIds(teamId, eventId),
      findActiveTeamPath(teamId),
      findFragmentsByTeam(teamId, eventId),
      findActiveGlitch(eventId, now),
      findUpcomingGlitches(eventId, now),
      countSkipsByTeam(teamId, eventId),
    ]);

  const unlocked = new Set(unlockedIds);
  const solved = new Set(solvedIds);
  const skipped = new Set(skippedIds);
  const byId = new Map(challenges.map((c) => [c.id, c]));

  const path = activePath ? await findPathById(activePath.pathId, eventId) : null;
  const pathChallenges = activePath ? await findPathChallenges(activePath.pathId) : [];
  const pathChallengeIds = new Set(pathChallenges.map((pc) => pc.challengeId));

  // Never leak flag_hash to a player. Also drops anything an admin has pulled
  // mid-event: `state = 'hidden'` is the documented way to retire a broken
  // challenge, and a team that already had it revealed must stop seeing it.
  const present = (challengeId: string) => {
    const c = byId.get(challengeId);
    if (!c || c.state !== "visible") return null;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      categoryId: c.categoryId,
      difficulty: c.difficulty,
      initialPoints: c.initialPoints,
      minPoints: c.minPoints,
      maxAttempts: c.maxAttempts,
      author: c.author,
    };
  };

  const pathBoard = pathChallenges
    .filter((pc) => unlocked.has(pc.challengeId) && byId.get(pc.challengeId)?.state === "visible")
    .map((pc) => {
      const isSolved = solved.has(pc.challengeId);
      const isSkipped = skipped.has(pc.challengeId);
      return {
        ...present(pc.challengeId),
        sequence: pc.sequence,
        tier: pc.tier,
        isPathFinal: pc.isPathFinal,
        status: isSolved ? "solved" : isSkipped ? "skipped" : "open",
        preStory: pc.preStory,
        // The post-story is the reward for solving — withheld until then.
        postStory: isSolved ? pc.postStory : null,
      };
    });

  // Pathless challenges: the welcome challenge, and the convergence final once
  // all three fragments are in hand.
  const standalone = [...unlocked]
    .filter((id) => !pathChallengeIds.has(id))
    .map((id) => ({ ...present(id), status: solved.has(id) ? "solved" : "open" }))
    .filter((c) => c.id);

  return {
    path: path
      ? {
          id: path.id,
          code: path.code,
          name: path.name,
          delivers: path.delivers,
          introNarration: path.introNarration,
          rewardMultiplier: activePath!.rewardMultiplier,
          entryReason: activePath!.entryReason,
          solved: pathChallenges.filter((pc) => solved.has(pc.challengeId)).length,
          total: pathChallenges.length,
        }
      : null,
    challenges: pathBoard,
    standalone,
    skips: { used: skipsUsed, remaining: Math.max(0, SKIP_QUOTA - skipsUsed), quota: SKIP_QUOTA },
    fragments: fragments.map((f) => f.fragmentKey),
    timeGlitch: {
      active: glitch ? { id: glitch.id, label: glitch.label, endsAt: glitch.endsAt } : null,
      next: upcoming.find((g) => g.startsAt > now) ?? null,
    },
  };
}
