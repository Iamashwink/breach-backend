import { SignJWT, jwtVerify } from "jose";
import { env } from "@/initializers/load-env";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ALG = "HS256";
const EXPIRY = "1d";

export interface AuthTokenPayload {
  sub: string;
  isAdmin: boolean;
}

export async function signToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ isAdmin: payload.isAdmin })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return { sub: payload.sub as string, isAdmin: Boolean(payload.isAdmin) };
}
