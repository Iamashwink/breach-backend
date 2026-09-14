import { uuid } from "drizzle-orm/pg-core";
import { coreUser } from "@/models/core/user";

export const authorship = {
  createdBy: uuid("created_by").references(() => coreUser.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => coreUser.id, { onDelete: "set null" }),
};
