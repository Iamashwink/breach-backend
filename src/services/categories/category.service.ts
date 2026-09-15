import { ConflictError, NotFoundError } from "@/errors/error-types";
import {
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
  const deleted = await deleteCategory(id);
  if (!deleted) throw new NotFoundError("Category not found");
  return deleted;
}
