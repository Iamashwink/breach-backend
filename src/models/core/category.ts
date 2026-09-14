import { pgTable, smallserial, text } from "drizzle-orm/pg-core";
import { authorship } from "@/models/shared/authorship";
import { timestamps } from "@/models/shared/timestamp_audit";

export const coreCategory = pgTable("core_category", {
  id: smallserial("id").primaryKey(),
  name: text("name").notNull().unique(),

  ...timestamps,
  ...authorship,
});
