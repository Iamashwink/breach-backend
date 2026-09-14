import * as authService from "@/services/auth/auth.service";
import { logger } from "@/loggers/logger";

/**
 * Thin request/response shaping over `services/auth`. No business logic
 * lives here — see README's layer rules.
 */
export async function signup(body: { username: string; email: string; password: string }) {
  logger.info({ controller: "auth.signup", username: body.username }, "Controller started");
  try {
    const result = await authService.signup(body);
    logger.info({ controller: "auth.signup", userId: result.user.id }, "Controller succeeded");
    return result;
  } finally {
    logger.info({ controller: "auth.signup" }, "Controller ended");
  }
}

export async function login(body: { email: string; password: string }) {
  logger.info({ controller: "auth.login", email: body.email }, "Controller started");
  try {
    const result = await authService.login(body);
    logger.info({ controller: "auth.login", userId: result.user.id }, "Controller succeeded");
    return result;
  } finally {
    logger.info({ controller: "auth.login" }, "Controller ended");
  }
}

export async function me(userId: string) {
  logger.info({ controller: "auth.me", userId }, "Controller started");
  try {
    const result = await authService.getCurrentUser(userId);
    logger.info({ controller: "auth.me", userId }, "Controller succeeded");
    return result;
  } finally {
    logger.info({ controller: "auth.me", userId }, "Controller ended");
  }
}
