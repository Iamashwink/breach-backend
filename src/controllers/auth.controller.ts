import {
  findProfileByEmail,
  findProfileByUsername,
  createProfile,
} from "@/models/profile.model";
import { hashPassword, verifyPassword, signToken } from "@/services/auth.service";
import { ConflictError, UnauthorizedError } from "@/errors/error-types";

export async function signup(body: {
  username: string;
  email: string;
  password: string;
}) {
  const [byEmail, byUsername] = await Promise.all([
    findProfileByEmail(body.email),
    findProfileByUsername(body.username),
  ]);

  if (byEmail) throw new ConflictError("Email already in use");
  if (byUsername) throw new ConflictError("Username already taken");

  const passwordHash = await hashPassword(body.password);
  const profile = await createProfile({
    username: body.username,
    email: body.email,
    passwordHash,
  });

  const token = await signToken({ sub: profile.id, role: profile.role });
  return {
    token,
    user: { id: profile.id, username: profile.username, role: profile.role },
  };
}

export async function login(body: { email: string; password: string }) {
  const profile = await findProfileByEmail(body.email);
  if (!profile) throw new UnauthorizedError("Invalid email or password");

  const valid = await verifyPassword(body.password, profile.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  const token = await signToken({ sub: profile.id, role: profile.role });
  return {
    token,
    user: { id: profile.id, username: profile.username, role: profile.role },
  };
}
