import Elysia, { t } from "elysia";
import { authGuard, adminGuard } from "@/middlewares/auth-guard";
import {
  handleCreateCategory,
  handleDeleteCategory,
  handleListCategories,
} from "@/controllers/categories/category.controller";
import { createCategoryBody } from "@/schema/dto/category.dto";

export const categoryRoutes = new Elysia()
  .use(authGuard)
  .get("/categories", () => handleListCategories());

export const adminCategoryRoutes = new Elysia()
  .use(adminGuard)
  .post(
    "/admin/categories",
    ({ body, user }) => handleCreateCategory(body.name, user.id),
    { body: createCategoryBody },
  )
  .delete(
    "/admin/categories/:id",
    ({ params }) => handleDeleteCategory(Number(params.id)),
    { params: t.Object({ id: t.String() }) },
  );
