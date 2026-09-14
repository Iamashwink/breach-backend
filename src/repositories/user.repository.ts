import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { coreUser } from "@/models/core/user";

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(coreUser)
    .where(sql`lower(${coreUser.email}) = lower(${email})`);
  return rows[0] ?? null;
}

export async function findUserByUsername(username: string) {
  const rows = await db
    .select()
    .from(coreUser)
    .where(sql`lower(${coreUser.username}) = lower(${username})`);
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const rows = await db.select().from(coreUser).where(eq(coreUser.id, id));
  return rows[0] ?? null;
}

export async function createUser(data: {
  username: string;
  email: string;
  passwordHash: string;
}) {
  const rows = await db.insert(coreUser).values(data).returning();
  return rows[0]!;
}
