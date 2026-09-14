/**
 * Password hashing, isolated behind this module so the rest of the app
 * never touches `Bun.password` directly and can swap algorithms in one place.
 */
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}
