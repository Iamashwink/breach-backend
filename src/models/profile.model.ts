import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/schema/dao/profiles";

export async function findProfileByUsername(username: string) {
  return db
    .select()
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export async function findProfileByEmail(email: string) {
  return db
    .select()
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export async function findProfileById(id: string) {
  return db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export async function createProfile(data: {
  username: string;
  email: string;
  passwordHash: string;
}) {
  return db
    .insert(profiles)
    .values(data)
    .returning()
    .then((r) => r[0]);
}
