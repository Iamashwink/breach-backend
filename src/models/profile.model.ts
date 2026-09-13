import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/schema/dao/profiles";

export async function findProfileByEmail(email: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.email, email));
  return rows[0] ?? null;
}

export async function findProfileByUsername(username: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.username, username));
  return rows[0] ?? null;
}

export async function findProfileById(id: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.id, id));
  return rows[0] ?? null;
}

export async function createProfile(data: {
  username: string;
  email: string;
  passwordHash: string;
}) {
  const rows = await db.insert(profiles).values(data).returning();
  return rows[0];
}
