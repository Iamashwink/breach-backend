/**
 * Seeds Round 1 — Signal Zero.
 *
 * Idempotent by content: re-running updates the challenges and story text in
 * place rather than duplicating them, so fixing a typo in the narration is
 * `bun run db:seed` and not a manual UPDATE. It never touches team state, so it
 * is safe to re-run mid-event to correct content.
 *
 *   bun run db:seed
 *   bun run db:seed -- --slug breachpoint-2026-r1
 */
import { createHash } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { logger } from "@/loggers/logger";
import { coreCategory } from "@/models/core/category";
import { coreChallenge } from "@/models/core/challenge";
import { coreEvent } from "@/models/core/event";
import { szChallengePrereq } from "@/models/event-specific/challenge-prereq";
import { szPath } from "@/models/event-specific/path";
import { szPathChallenge } from "@/models/event-specific/path-challenge";
import {
  SEED_CATEGORIES,
  SEED_CONVERGENCE,
  SEED_PATHS,
  SEED_PATH_CHALLENGES,
  SEED_POINTS,
  SEED_PREREQS,
  SEED_WELCOME,
  type SeedDifficulty,
} from "@/services/signal-zero/content";

const hashFlag = (flag: string) => createHash("sha256").update(flag.trim()).digest("hex");

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
};

async function seed() {
  const slug = arg("slug", "breachpoint-2026-r1");

  await db.transaction(async (tx) => {
    // 1. Event
    const [event] = await tx
      .insert(coreEvent)
      .values({
        slug,
        name: "BreachPoint 2026 — Round 1: Signal Zero",
        description: "The past never disconnected.",
      })
      .onConflictDoUpdate({ target: coreEvent.slug, set: { name: "BreachPoint 2026 — Round 1: Signal Zero" } })
      .returning();

    const eventId = event!.id;
    logger.info({ eventId, slug }, "seed: event ready");

    // 2. Categories — shared across every event, so keyed by name.
    for (const name of SEED_CATEGORIES) {
      await tx.insert(coreCategory).values({ name }).onConflictDoNothing();
    }
    const categories = await tx.select().from(coreCategory);
    const categoryId = (name: string) => {
      const found = categories.find((c) => c.name === name);
      if (!found) throw new Error(`seed: category "${name}" missing`);
      return found.id;
    };

    // 3. Challenges. Keyed on (event, title) since core_challenge has no code
    //    column — titles are unique within this content set.
    const existing = await tx.select().from(coreChallenge).where(eq(coreChallenge.eventId, eventId));
    const byTitle = new Map(existing.map((c) => [c.title, c]));

    const upsertChallenge = async (input: {
      title: string;
      description: string;
      category: string;
      difficulty: SeedDifficulty;
      flag: string;
    }) => {
      const points = SEED_POINTS[input.difficulty];
      const values = {
        eventId,
        title: input.title,
        description: input.description,
        categoryId: categoryId(input.category),
        difficulty: input.difficulty,
        initialPoints: points.initial,
        minPoints: points.min,
        flagHash: hashFlag(input.flag),
        // Seeded hidden. Making the event live is a deliberate admin action,
        // not a side effect of loading content.
        state: "hidden" as const,
      };

      const found = byTitle.get(input.title);
      if (found) {
        const [updated] = await tx
          .update(coreChallenge)
          .set(values)
          .where(eq(coreChallenge.id, found.id))
          .returning();
        return updated!;
      }
      const [created] = await tx.insert(coreChallenge).values(values).returning();
      byTitle.set(input.title, created!);
      return created!;
    };

    const welcome = await upsertChallenge({
      title: SEED_WELCOME.title,
      description: SEED_WELCOME.description,
      category: SEED_WELCOME.category,
      difficulty: SEED_WELCOME.difficulty,
      flag: SEED_WELCOME.flag,
    });

    const convergence = await upsertChallenge({
      title: SEED_CONVERGENCE.title,
      description: SEED_CONVERGENCE.description,
      category: SEED_CONVERGENCE.category,
      difficulty: SEED_CONVERGENCE.difficulty,
      flag: SEED_CONVERGENCE.flag,
    });

    // 4. Paths, 5. path challenges with their story.
    const challengeIdByCode = new Map<string, string>();
    const finals: string[] = [];

    for (const path of SEED_PATHS) {
      const [pathRow] = await tx
        .insert(szPath)
        .values({
          eventId,
          code: path.code,
          name: path.name,
          delivers: path.delivers,
          introNarration: path.introNarration,
        })
        .onConflictDoUpdate({
          target: [szPath.eventId, szPath.code],
          set: { name: path.name, introNarration: path.introNarration, delivers: path.delivers },
        })
        .returning();

      for (const pc of SEED_PATH_CHALLENGES[path.code]!) {
        const challenge = await upsertChallenge({
          title: pc.title,
          // The technical brief stays on core; the story lives in the module.
          description: pc.preStory,
          category: pc.category,
          difficulty: pc.difficulty,
          flag: pc.flag,
        });
        challengeIdByCode.set(pc.code, challenge.id);
        if (pc.isPathFinal) finals.push(challenge.id);

        await tx
          .insert(szPathChallenge)
          .values({
            challengeId: challenge.id,
            eventId,
            pathId: pathRow!.id,
            sequence: pc.sequence,
            tier: pc.tier,
            preStory: pc.preStory,
            postStory: pc.postStory,
            isPathFinal: pc.isPathFinal ?? false,
            fragmentKey: pc.fragmentKey,
          })
          .onConflictDoUpdate({
            target: szPathChallenge.challengeId,
            set: {
              pathId: pathRow!.id,
              sequence: pc.sequence,
              tier: pc.tier,
              preStory: pc.preStory,
              postStory: pc.postStory,
              isPathFinal: pc.isPathFinal ?? false,
              fragmentKey: pc.fragmentKey,
            },
          });
      }
      logger.info({ path: path.code }, "seed: path loaded");
    }

    // 6. Prerequisites — A10's two gates, and convergence's three.
    const prereqRows = [
      ...Object.entries(SEED_PREREQS).flatMap(([code, requires]) =>
        requires.map((r) => ({
          eventId,
          challengeId: challengeIdByCode.get(code)!,
          requiresId: challengeIdByCode.get(r)!,
        })),
      ),
      ...finals.map((requiresId) => ({ eventId, challengeId: convergence.id, requiresId })),
    ];

    await tx.insert(szChallengePrereq).values(prereqRows).onConflictDoNothing();

    logger.info(
      {
        eventId,
        challenges: byTitle.size,
        paths: SEED_PATHS.length,
        prereqs: prereqRows.length,
        welcome: welcome.id,
        convergence: convergence.id,
      },
      "seed: complete — challenges are hidden, publish the event to open them",
    );
  });
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error }, "seed: failed");
    process.exit(1);
  });
