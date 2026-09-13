import { SignJWT, jwtVerify } from "jose";
import { env } from "@/initializers/load-env";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ALG = "HS256";
const EXPIRY = "7d";

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export async function signToken(payload: { sub: string; role: string }): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ sub: string; role: string }> {
  const { payload } = await jwtVerify(token, secret);
  return { sub: payload.sub as string, role: payload.role as string };
}
