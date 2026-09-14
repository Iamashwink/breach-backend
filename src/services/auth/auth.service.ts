import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
} from "@/repositories/user.repository";
import { hashPassword, verifyPassword } from "@/services/auth/password.service";
import { signToken } from "@/services/auth/token.service";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "@/errors/error-types";
import { logger } from "@/loggers/logger";

function toPublicUser(user: { id: string; username: string; isAdmin: boolean }) {
  return { id: user.id, username: user.username, isAdmin: user.isAdmin };
}

export async function signup(body: { username: string; email: string; password: string }) {
  logger.info({ service: "auth.signup", username: body.username }, "Service started");
  try {
    const [byEmail, byUsername] = await Promise.all([
      findUserByEmail(body.email),
      findUserByUsername(body.username),
    ]);

    if (byEmail) throw new ConflictError("Email already in use");
    if (byUsername) throw new ConflictError("Username already taken");

    const passwordHash = await hashPassword(body.password);
    const user = await createUser({
      username: body.username,
      email: body.email,
      passwordHash,
    });

    const token = await signToken({ sub: user.id, isAdmin: user.isAdmin });
    const result = { token, user: toPublicUser(user) };
    logger.info({ service: "auth.signup", userId: user.id }, "Service succeeded");
    return result;
  } finally {
    logger.info({ service: "auth.signup" }, "Service ended");
  }
}

export async function login(body: { email: string; password: string }) {
  logger.info({ service: "auth.login", email: body.email }, "Service started");
  try {
    const user = await findUserByEmail(body.email);
    if (!user) throw new UnauthorizedError("Invalid email or password");

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    if (user.isBanned) throw new ForbiddenError("This account has been banned");

    const token = await signToken({ sub: user.id, isAdmin: user.isAdmin });
    const result = { token, user: toPublicUser(user) };
    logger.info({ service: "auth.login", userId: user.id }, "Service succeeded");
    return result;
  } finally {
    logger.info({ service: "auth.login" }, "Service ended");
  }
}

export async function getCurrentUser(userId: string) {
  logger.info({ service: "auth.me", userId }, "Service started");
  try {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");
    const result = toPublicUser(user);
    logger.info({ service: "auth.me", userId }, "Service succeeded");
    return result;
  } finally {
    logger.info({ service: "auth.me", userId }, "Service ended");
  }
}
