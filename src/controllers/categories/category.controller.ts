import { logger } from "@/loggers/logger";
import { addCategory, listCategories, removeCategory } from "@/services/categories/category.service";

export async function handleListCategories() {
  return listCategories();
}

export async function handleCreateCategory(name: string, userId: string) {
  logger.info({ name }, "Creating category");
  const category = await addCategory(name, userId);
  logger.info({ categoryId: category.id }, "Category created");
  return category;
}

export async function handleDeleteCategory(id: number) {
  logger.info({ categoryId: id }, "Deleting category");
  return removeCategory(id);
}
