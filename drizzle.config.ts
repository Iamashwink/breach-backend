import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Single barrel so core and event-specific enums are picked up alongside
  // the tables and views that use them.
  schema: "./src/models/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
