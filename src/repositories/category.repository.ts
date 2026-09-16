import { count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { coreCategory } from "@/models/core/category";
import { coreChallenge } from "@/models/core/challenge";

export async function findAllCategories() {
  return db.select().from(coreCategory).orderBy(coreCategory.name);
}

export async function findCategoryById(id: number) {
  const rows = await db.select().from(coreCategory).where(eq(coreCategory.id, id));
  return rows[0] ?? null;
}

export async function findCategoryByName(name: string) {
  const rows = await db.select().from(coreCategory).where(eq(coreCategory.name, name));
  return rows[0] ?? null;
}

export async function createCategory(data: { name: string; createdBy?: string }) {
  const rows = await db.insert(coreCategory).values(data).returning();
  return rows[0]!;
}

/**
 * How many challenges still point at this category. `core_challenge.category_id`
 * has no ON DELETE, so Postgres defaults to RESTRICT — deleting a category in
 * use raises a foreign-key error rather than doing anything useful.
 */
export async function countChallengesByCategory(id: number) {
  const rows = await db
    .select({ count: count() })
    .from(coreChallenge)
    .where(eq(coreChallenge.categoryId, id));
  return Number(rows[0]?.count ?? 0);
}

export async function deleteCategory(id: number) {
  const rows = await db.delete(coreCategory).where(eq(coreCategory.id, id)).returning();
  return rows[0] ?? null;
}
