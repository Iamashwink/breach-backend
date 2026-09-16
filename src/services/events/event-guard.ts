import { ForbiddenError, NotFoundError, ValidationError } from "@/errors/error-types";
import { findEventById } from "@/repositories/event.repository";
import { findTeamById, findUserTeamMembership } from "@/repositories/team.repository";
import { findUserById } from "@/repositories/user.repository";

/**
 * The checks every scoring action shares: the event is actually running, the
 * player is not banned, and their team has not been disqualified.
 *
 * These live here rather than in each service because "can this team score
 * right now" must answer identically for a flag submission, a hint unlock and
 * a skip — three places that would otherwise drift apart.
 *
 * Note this is deliberately NOT in the auth guard: a banned user can still log
 * in and read the scoreboard; what they lose is the ability to change it.
 */

export async function ensureEventRunning(eventId: string) {
  const event = await findEventById(eventId);
  if (!event) throw new NotFoundError("Event not found");
  if (!event.isPublished) throw new ForbiddenError("Event is not open");

  const now = new Date();
  if (event.startsAt && now < event.startsAt)
    throw new ForbiddenError("Event has not started yet");
  if (event.endsAt && now > event.endsAt) throw new ForbiddenError("Event has ended");

  return event;
}

export async function ensurePlayerCanScore(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("User not found");
  // Checked here as well as at login: a ban issued mid-event must bite before
  // the player's existing token expires.
  if (user.isBanned) throw new ForbiddenError("This account has been banned");
  return user;
}

export async function ensureTeamCanScore(teamId: string) {
  const team = await findTeamById(teamId);
  if (!team) throw new NotFoundError("Team not found");
  if (team.disqualifiedAt) throw new ForbiddenError("This team has been disqualified");
  return team;
}

/**
 * The full gate for any point-changing action. Returns the event, the team and
 * the acting member's role in one pass so callers don't re-query.
 */
export async function ensureCanScore(userId: string, eventId: string, action = "do this") {
  const [event] = await Promise.all([
    ensureEventRunning(eventId),
    ensurePlayerCanScore(userId),
  ]);

  const membership = await findUserTeamMembership(eventId, userId);
  if (!membership) throw new ValidationError(`You must be in a team to ${action}`);

  const team = await ensureTeamCanScore(membership.teamId);

  return { event, team, teamId: membership.teamId, role: membership.role };
}
