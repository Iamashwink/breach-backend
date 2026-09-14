import { t } from "elysia";

export const createCategoryBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 50 }),
});
