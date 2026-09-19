/**
 * Seeds Round 1 — Signal Zero from `src/db/data/breachpoint_challenges.json`.
 *
 * Idempotent by content: re-running updates the challenges, technical descriptions,
 * resource links, and story text in place. Safe to re-run mid-event.
 *
 *   bun run db:seed
 *   bun run db:seed -- --slug breachpoint-2026-r1
 */
import { logger } from "@/loggers/logger";
import { importChallenges } from "@/db/import-challenges";

importChallenges()
  .then(() => {
    logger.info("seed: complete");
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ err: err instanceof Error ? err.message : err }, "seed: failed");
    process.exit(1);
  });
