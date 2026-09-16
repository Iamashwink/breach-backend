import { findChallengesByEvent } from "@/repositories/challenge.repository";
import {
  findActiveTeamPath,
  findPathById,
  findPathChallenges,
  findPathedChallengeIds,
  findPathsByEvent,
  findSolvedChallengeIds,
  findTeamPaths,
  findTeamPathScores,
} from "@/repositories/sz-path.repository";
import { getTeamStanding } from "@/repositories/leaderboard.repository";
import { findSolveCountsByEvent } from "@/repositories/submission.repository";
import { calculatePoints } from "@/services/challenges/scoring";
import { countSkipsByTeam, findSkippedChallengeIds } from "@/repositories/sz-skip.repository";
import { findPrereqsByEvent, findUnlockedChallengeIds } from "@/repositories/sz-reveal.repository";
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
  const { team, teamId } = await ensureCanScore(userId, eventId, "view the board");

  await syncUnlocks(teamId, eventId, "initial");

  const now = new Date();
  const [
    challenges,
    unlockedIds,
    solvedIds,
    skippedIds,
    activePath,
    fragments,
    glitch,
    upcoming,
    skipsUsed,
    allPaths,
    pathScoreRows,
    standing,
    prereqs,
    pathedIds,
    solveCounts,
  ] = await Promise.all([
    findChallengesByEvent(eventId),
    findUnlockedChallengeIds(teamId, eventId),
    findSolvedChallengeIds(teamId, eventId),
    findSkippedChallengeIds(teamId, eventId),
    findActiveTeamPath(teamId),
    findFragmentsByTeam(teamId, eventId),
    findActiveGlitch(eventId, now),
    findUpcomingGlitches(eventId, now),
    countSkipsByTeam(teamId, eventId),
    findPathsByEvent(eventId),
    findTeamPathScores(teamId, eventId),
    getTeamStanding(eventId, teamId),
    findPrereqsByEvent(eventId),
    findPathedChallengeIds(eventId),
    findSolveCountsByEvent(eventId),
  ]);

  const unlocked = new Set(unlockedIds);
  const solved = new Set(solvedIds);
  const skipped = new Set(skippedIds);
  const byId = new Map(challenges.map((c) => [c.id, c]));

  const path = activePath ? await findPathById(activePath.pathId, eventId) : null;
  const pathChallenges = activePath ? await findPathChallenges(activePath.pathId) : [];

  /**
   * Every challenge belonging to *any* path in this event — not just the active
   * one.
   *
   * "Standalone" means pathless, and a team that has run a path keeps its
   * unlock rows as history. Filtering against only the active path's ids let
   * a finished path's challenges (A10 among them, which has prerequisites and
   * so looks gated) surface as pathless, and the client reading the gated one
   * as the convergence final got the wrong challenge entirely.
   */
  const pathedChallengeIds = new Set(pathedIds);

  // Never leak flag_hash to a player. Also drops anything an admin has pulled
  // mid-event: `state = 'hidden'` is the documented way to retire a broken
  // challenge, and a team that already had it revealed must stop seeing it.
  const present = (challengeId: string) => {
    const c = byId.get(challengeId);
    if (!c || c.state !== "visible") return null;
    const solves = solveCounts.get(c.id) ?? 0;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      categoryId: c.categoryId,
      difficulty: c.difficulty,
      initialPoints: c.initialPoints,
      minPoints: c.minPoints,
      // What a solve pays right now, before the team's path multiplier. A
      // Time Glitch suspends decay entirely, so during a window every
      // challenge is quoted — and paid — at its full initial value.
      currentPoints: glitch ? c.initialPoints : calculatePoints(c, solves),
      solves,
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

  // Every path's challenge ids and this team's attempt at it, so the dashboard
  // can render A/B/C progress without three more round trips.
  const [attempts, allPathChallenges] = await Promise.all([
    findTeamPaths(teamId),
    Promise.all(allPaths.map((p) => findPathChallenges(p.id))),
  ]);
  const attemptByPathId = new Map(attempts.map((a) => [a.pathId, a]));
  const challengeIdsByPath = new Map(
    allPaths.map((p, i) => [p.id, (allPathChallenges[i] ?? []).map((pc) => pc.challengeId)]),
  );

  /**
   * What the team closed on every path, by sequence — including paths they have
   * left.
   *
   * `challenges` above only carries the *active* path's reveal window, so
   * without this a team that switched from A to B would see its finished A
   * nodes drawn as sealed: the points are on the dashboard but the chart has
   * forgotten them. Sequences only, no titles or stories — a left path is
   * closed forever, and there is no reason to hand back the content of one.
   */
  const history = allPaths.map((path, i) => {
    const pathChallengeRows = allPathChallenges[i] ?? [];
    return {
      pathId: path.id,
      code: path.code,
      solved: pathChallengeRows.filter((pc) => solved.has(pc.challengeId)).map((pc) => pc.sequence),
      skipped: pathChallengeRows.filter((pc) => skipped.has(pc.challengeId)).map((pc) => pc.sequence),
    };
  });

  // Pathless challenges: the welcome challenge, and the convergence final once
  // all three fragments are in hand.
  //
  // `isFinal` is derived the same way the module identifies these two
  // elsewhere — the convergence is gated on the three path finals, the welcome
  // gate has no prerequisites at all. Sending the distinction saves the client
  // from guessing at it by point value, which would break the moment an admin
  // retuned the scoring.
  const gated = new Set(prereqs.map((p) => p.challengeId));
  const standalone = [...unlocked]
    .filter((id) => !pathedChallengeIds.has(id))
    .map((id) => ({
      ...present(id),
      status: solved.has(id) ? "solved" : "open",
      isFinal: gated.has(id),
    }))
    .filter((c) => c.id);

  // Points are attributed to the path that owned the challenge, not to the
  // team's current attempt — a team that banked six solves in A and switched
  // to B still holds A's points, and the dashboard must show that.
  const pointsByCode = new Map(pathScoreRows.map((r) => [r.code, r]));

  return {
    team: { id: team.id, name: team.name },
    // Authoritative score, straight off the same view the scoreboard reads, so
    // the HUD and the board can never disagree. Hint spend is already netted
    // out — do not subtract it again client-side.
    score: standing?.score ?? 0,
    rank: standing?.rank ?? null,
    solveCount: standing?.solveCount ?? solvedIds.length,
    pathScores: {
      A: pointsByCode.get("A")?.points ?? 0,
      B: pointsByCode.get("B")?.points ?? 0,
      C: pointsByCode.get("C")?.points ?? 0,
      // Pathless solves (welcome, convergence) group under a null code.
      standalone: pointsByCode.get(null)?.points ?? 0,
    },
    paths: allPaths.map((p) => {
      const attempt = attemptByPathId.get(p.id);
      const ids = challengeIdsByPath.get(p.id) ?? [];
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        delivers: p.delivers,
        introNarration: p.introNarration,
        isActive: attempt?.isActive ?? false,
        // (team_id, path_id) is unique: an attempted path can never be
        // re-entered, so "attempted and not active" means permanently closed.
        isAttempted: !!attempt,
        isAvailable: !attempt,
        rewardMultiplier: attempt?.rewardMultiplier ?? null,
        entryReason: attempt?.entryReason ?? null,
        solved: ids.filter((id) => solved.has(id)).length,
        skipped: ids.filter((id) => skipped.has(id)).length,
        total: ids.length,
        points: pointsByCode.get(p.code)?.points ?? 0,
      };
    }),
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
    history,
    standalone,
    skips: { used: skipsUsed, remaining: Math.max(0, SKIP_QUOTA - skipsUsed), quota: SKIP_QUOTA },
    fragments: fragments.map((f) => f.fragmentKey),
    timeGlitch: {
      active: glitch ? { id: glitch.id, label: glitch.label, endsAt: glitch.endsAt } : null,
      next: upcoming.find((g) => g.startsAt > now) ?? null,
    },
  };
}
