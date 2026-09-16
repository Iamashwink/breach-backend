/**
 * Opens (or closes) a seeded event for play.
 *
 * `db:seed` deliberately leaves every challenge `hidden` and the event
 * unpublished — loading content and starting a CTF are different decisions, and
 * a seed that went live on its own would make re-running it mid-event
 * dangerous. This script is the deliberate second step.
 *
 *   bun run db:publish                          # opens now, runs 8 hours
 *   bun run db:publish -- --hours 48
 *   bun run db:publish -- --slug my-event --starts-at 2026-03-01T09:00:00Z
 *   bun run db:publish -- --close               # unpublish and re-hide
 *
 * Idempotent: re-running just moves the window.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { logger } from "@/loggers/logger";
import { coreChallenge } from "@/models/core/challenge";
import { coreEvent } from "@/models/core/event";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

async function publish() {
  const slug = arg("slug") ?? "breachpoint-2026-r1";
  const close = flag("close");

  await db.transaction(async (tx) => {
    const [event] = await tx.select().from(coreEvent).where(eq(coreEvent.slug, slug));
    if (!event) throw new Error(`No event with slug "${slug}" — run \`bun run db:seed\` first`);

    if (close) {
      await tx.update(coreEvent).set({ isPublished: false }).where(eq(coreEvent.id, event.id));
      const hidden = await tx
        .update(coreChallenge)
        .set({ state: "hidden" })
        .where(and(eq(coreChallenge.eventId, event.id), eq(coreChallenge.state, "visible")))
        .returning({ id: coreChallenge.id });
      logger.info({ eventId: event.id, hidden: hidden.length }, "publish: event closed");
      return;
    }

    const startsAt = arg("starts-at") ? new Date(arg("starts-at")!) : new Date();
    if (Number.isNaN(startsAt.getTime())) throw new Error("--starts-at must be an ISO timestamp");

    const hours = Number(arg("hours") ?? 8);
    if (!Number.isFinite(hours) || hours <= 0) throw new Error("--hours must be a positive number");
    const endsAt = arg("ends-at") ? new Date(arg("ends-at")!) : new Date(startsAt.getTime() + hours * 3600_000);
    if (Number.isNaN(endsAt.getTime())) throw new Error("--ends-at must be an ISO timestamp");
    if (endsAt <= startsAt) throw new Error("--ends-at must be after --starts-at");

    // core_event_published_has_window_check requires both dates before the
    // published flag can go true, so they are written in the same statement.
    await tx
      .update(coreEvent)
      .set({ startsAt, endsAt, isPublished: true })
      .where(eq(coreEvent.id, event.id));

    // Only hidden -> visible. A challenge an admin has deliberately pulled back
    // to `locked` is left alone; re-publishing must not undo that.
    const opened = await tx
      .update(coreChallenge)
      .set({ state: "visible" })
      .where(and(eq(coreChallenge.eventId, event.id), eq(coreChallenge.state, "hidden")))
      .returning({ id: coreChallenge.id });

    logger.info(
      { eventId: event.id, slug, startsAt, endsAt, opened: opened.length },
      "publish: event is live",
    );
  });
}

publish()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error: error instanceof Error ? error.message : error }, "publish: failed");
    process.exit(1);
  });
