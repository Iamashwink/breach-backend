import { ConflictError, NotFoundError } from "@/errors/error-types";
import {
  countChallengesByCategory,
  createCategory,
  deleteCategory,
  findAllCategories,
  findCategoryByName,
} from "@/repositories/category.repository";

export async function listCategories() {
  return findAllCategories();
}

export async function addCategory(name: string, createdBy: string) {
  const existing = await findCategoryByName(name);
  if (existing) throw new ConflictError(`Category "${name}" already exists`);
  return createCategory({ name, createdBy });
}

export async function removeCategory(id: number) {
  // core_challenge.category_id has no ON DELETE, so Postgres defaults to
  // RESTRICT — deleting a category in use raises a foreign-key error. Counting
  // first turns that into the number an admin actually needs to act on.
  const inUse = await countChallengesByCategory(id);
  if (inUse > 0)
    throw new ConflictError(
      `Category is used by ${inUse} challenge(s) — reassign them before deleting it`,
    );

  const deleted = await deleteCategory(id);
  if (!deleted) throw new NotFoundError("Category not found");
  return deleted;
}
