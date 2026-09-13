import { findProfileByEmail, findProfileByUsername, findProfileById, createProfile } from "@/models/profile.model";
import { hashPassword, verifyPassword } from "@/services/auth.service";
import { ConflictError, UnauthorizedError } from "@/errors/error-types";

type JwtSigner = { sign: (payload: Record<string, unknown>) => Promise<string> };

export const signup = async ({
  body,
  jwt,
}: {
  body: { username: string; email: string; password: string };
  jwt: JwtSigner;
}) => {
  const [existingEmail, existingUsername] = await Promise.all([
    findProfileByEmail(body.email),
    findProfileByUsername(body.username),
  ]);
  if (existingEmail) throw new ConflictError("Email already in use");
  if (existingUsername) throw new ConflictError("Username already taken");

  const passwordHash = await hashPassword(body.password);
  const profile = await createProfile({ username: body.username, email: body.email, passwordHash });

  const token = await jwt.sign({ sub: profile.id, role: profile.role });
  return { token, user: { id: profile.id, username: profile.username, role: profile.role } };
};

export const login = async ({
  body,
  jwt,
}: {
  body: { email: string; password: string };
  jwt: JwtSigner;
}) => {
  const profile = await findProfileByEmail(body.email);
  if (!profile) throw new UnauthorizedError("Invalid credentials");

  const valid = await verifyPassword(body.password, profile.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid credentials");

  const token = await jwt.sign({ sub: profile.id, role: profile.role });
  return { token, user: { id: profile.id, username: profile.username, role: profile.role } };
};

export const me = async ({ user }: { user: { id: string } }) => {
  const profile = await findProfileById(user.id);
  if (!profile) throw new UnauthorizedError();
  return { id: profile.id, username: profile.username, email: profile.email, role: profile.role };
};
