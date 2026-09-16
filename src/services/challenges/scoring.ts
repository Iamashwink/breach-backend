/**
 * Dynamic scoring: what a challenge is worth given how many teams have already
 * solved it.
 *
 * Lives on its own because two callers need the identical answer and must never
 * drift: `submission.service` uses it to price a solve, and `board.service`
 * uses it to advertise the current value. A board that quoted one number and a
 * submission that paid another would look like the server cheating.
 */
export type DecayType = "logarithmic" | "linear" | "static";

export interface DecayInput {
  initialPoints: number;
  minPoints: number;
  decayThreshold: number;
  decayType: DecayType;
}

/**
 * `solveCount` is the number of teams that have *already* solved it, so the
 * first solver is priced at 0 and gets the full initial value.
 */
export function calculatePoints(challenge: DecayInput, solveCount: number): number {
  const { initialPoints, minPoints, decayThreshold, decayType } = challenge;

  if (decayType === "static") return initialPoints;
  if (solveCount <= 0) return initialPoints;
  if (solveCount >= decayThreshold) return minPoints;

  const ratio =
    decayType === "logarithmic"
      ? Math.log(solveCount + 1) / Math.log(decayThreshold + 1)
      : solveCount / decayThreshold;

  return Math.max(minPoints, Math.round(initialPoints - (initialPoints - minPoints) * ratio));
}
