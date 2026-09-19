/**
 * Imports challenges from `src/db/data/breachpoint_challenges.json` into the database.
 *
 * Populates:
 *   - core_challenge: titles, descriptions, difficulty, flags (hashed), dynamic points, resourceLink
 *   - sz_path_challenge: path mapping, sequence (1..10), tier, preStory, postStory, fragments
 *   - sz_challenge_prereq: prerequisite gating (A10 requiring A3 and A7)
 *   - Standalone challenges: Transmission Zero (Welcome) and Convergence Final
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   bun run src/db/import-challenges.ts
 *   bun run src/db/import-challenges.ts -- --file path/to/challenges.json
 */
import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { and, eq } from "drizzle-orm";
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
  SEED_POINTS,
  SEED_PREREQS,
  SEED_WELCOME,
  type SeedDifficulty,
  type SeedTier,
} from "@/services/signal-zero/content";

interface JsonChallengeInput {
  code: string;
  sequence: number;
  tier: SeedTier;
  category: string;
  difficulty: SeedDifficulty;
  title: string;
  description: string;
  preStory: string;
  postStory: string;
  flag: string;
  resourceLink?: string | null;
  isPathFinal?: boolean;
  fragmentKey?: "who" | "how" | "why";
}

const hashFlag = (flag: string) => createHash("sha256").update(flag.trim()).digest("hex");

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
};

export async function importChallenges() {
  const slug = arg("slug", "breachpoint-2026-r1")!;
  const filePath = resolve(
    arg("file", resolve(__dirname, "data/breachpoint_challenges.json"))!,
  );

  if (!existsSync(filePath)) {
    throw new Error(`Challenge file not found: ${filePath}`);
  }

  const raw = readFileSync(filePath, "utf-8");
  const challenges: JsonChallengeInput[] = JSON.parse(raw);
  logger.info({ count: challenges.length, filePath }, "import: read challenges from file");

  await db.transaction(async (tx) => {
    // 1. Ensure Event exists
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
    logger.info({ eventId, slug }, "import: event ready");

    // 2. Ensure Categories exist
    for (const name of SEED_CATEGORIES) {
      await tx.insert(coreCategory).values({ name }).onConflictDoNothing();
    }
    const categories = await tx.select().from(coreCategory);
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const getCategoryId = (name: string) => {
      const id = categoryMap.get(name.trim().toLowerCase());
      if (!id) throw new Error(`import: category "${name}" is not recognized`);
      return id;
    };

    // 3. Upsert Helper
    const existing = await tx.select().from(coreChallenge).where(eq(coreChallenge.eventId, eventId));
    const byTitle = new Map(existing.map((c) => [c.title, c]));
    const byId = new Map(existing.map((c) => [c.id, c]));

    const upsertChallenge = async (input: {
      title: string;
      description: string;
      category: string;
      difficulty: SeedDifficulty;
      flag: string;
      resourceLink?: string | null;
      id?: string;
    }) => {
      const points = SEED_POINTS[input.difficulty];
      const values = {
        eventId,
        title: input.title,
        description: input.description,
        categoryId: getCategoryId(input.category),
        difficulty: input.difficulty,
        initialPoints: points.initial,
        minPoints: points.min,
        flagHash: hashFlag(input.flag),
        resourceLink: input.resourceLink ?? null,
        state: "visible" as const, // imported challenges are marked visible
      };

      const found = (input.id ? byId.get(input.id) : undefined) ?? byTitle.get(input.title);
      if (found) {
        const [updated] = await tx
          .update(coreChallenge)
          .set(values)
          .where(eq(coreChallenge.id, found.id))
          .returning();
        byTitle.set(input.title, updated!);
        byId.set(updated!.id, updated!);
        return updated!;
      }

      const [created] = await tx.insert(coreChallenge).values(values).returning();
      byTitle.set(input.title, created!);
      byId.set(created!.id, created!);
      return created!;
    };

    // 4. Standalone challenges (Welcome & Convergence)
    const welcome = await upsertChallenge({
      title: SEED_WELCOME.title,
      description: SEED_WELCOME.description,
      category: SEED_WELCOME.category,
      difficulty: SEED_WELCOME.difficulty,
      flag: SEED_WELCOME.flag,
      resourceLink: (SEED_WELCOME as any).resourceLink,
    });

    const convergence = await upsertChallenge({
      title: SEED_CONVERGENCE.title,
      description: SEED_CONVERGENCE.description,
      category: SEED_CONVERGENCE.category,
      difficulty: SEED_CONVERGENCE.difficulty,
      flag: SEED_CONVERGENCE.flag,
      resourceLink: (SEED_CONVERGENCE as any).resourceLink,
    });

    // 5. Ensure Paths exist (A, B, C)
    const pathRowsByCode = new Map<string, typeof szPath.$inferSelect>();
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
      pathRowsByCode.set(path.code, pathRow!);
    }

    // Map existing path challenges by (pathId, sequence) -> challengeId
    const existingPathChallenges = await tx
      .select({
        challengeId: szPathChallenge.challengeId,
        pathId: szPathChallenge.pathId,
        sequence: szPathChallenge.sequence,
      })
      .from(szPathChallenge)
      .where(eq(szPathChallenge.eventId, eventId));

    const pathChallengeSlotMap = new Map<string, string>(); // `${pathId}:${sequence}` -> challengeId
    for (const pc of existingPathChallenges) {
      pathChallengeSlotMap.set(`${pc.pathId}:${pc.sequence}`, pc.challengeId);
    }

    // 6. Insert/Update Path Challenges from JSON
    const challengeIdByCode = new Map<string, string>();
    const finals: string[] = [];

    for (const item of challenges) {
      const pathCode = item.code.charAt(0).toUpperCase();
      const pathRow = pathRowsByCode.get(pathCode);
      if (!pathRow) throw new Error(`import: path "${pathCode}" not found for challenge ${item.code}`);

      // Sequence 10 is path final
      const isPathFinal = item.sequence === 10 || item.isPathFinal === true;
      const fragmentKey = isPathFinal
        ? (item.fragmentKey ?? pathRow.delivers)
        : null;

      // Match by slot (pathId + sequence) first, or fallback to title
      const existingIdForSlot = pathChallengeSlotMap.get(`${pathRow.id}:${item.sequence}`);

      // Upsert into core_challenge
      const challenge = await upsertChallenge({
        id: existingIdForSlot,
        title: item.title,
        description: item.description,
        category: item.category,
        difficulty: item.difficulty,
        flag: item.flag,
        resourceLink: item.resourceLink,
      });

      challengeIdByCode.set(item.code, challenge.id);
      if (isPathFinal) finals.push(challenge.id);

      // Upsert into sz_path_challenge
      await tx
        .insert(szPathChallenge)
        .values({
          challengeId: challenge.id,
          eventId,
          pathId: pathRow.id,
          sequence: item.sequence,
          tier: item.tier,
          preStory: item.preStory,
          postStory: item.postStory,
          isPathFinal,
          fragmentKey,
        })
        .onConflictDoUpdate({
          target: szPathChallenge.challengeId,
          set: {
            pathId: pathRow.id,
            sequence: item.sequence,
            tier: item.tier,
            preStory: item.preStory,
            postStory: item.postStory,
            isPathFinal,
            fragmentKey,
          },
        });
    }

    // 7. Prerequisites: Gated challenges (A10 requires A3 and A7)
    for (const [targetCode, reqCodes] of Object.entries(SEED_PREREQS)) {
      const targetId = challengeIdByCode.get(targetCode);
      if (!targetId) continue;

      for (const reqCode of reqCodes) {
        const reqId = challengeIdByCode.get(reqCode);
        if (!reqId) continue;

        await tx
          .insert(szChallengePrereq)
          .values({ eventId, challengeId: targetId, requiresId: reqId })
          .onConflictDoNothing();
      }
    }

    // Convergence prerequisite: requires all path finals
    for (const finalId of finals) {
      await tx
        .insert(szChallengePrereq)
        .values({ eventId, challengeId: convergence.id, requiresId: finalId })
        .onConflictDoNothing();
    }

    logger.info(
      {
        imported: challenges.length,
        paths: pathRowsByCode.size,
        welcomeId: welcome.id,
        convergenceId: convergence.id,
      },
      "import: completed successfully",
    );
  });
}

// Run when executed directly
if (import.meta.main) {
  importChallenges()
    .then(() => {
      logger.info("import: done");
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err: err instanceof Error ? err.message : err }, "import: failed");
      process.exit(1);
    });
}
