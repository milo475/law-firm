import { Role } from '@law-firm/shared';

/**
 * What each role is allowed to be, in one place.
 *
 * A route still names its roles one by one (`@Roles(Role.ADMIN, Role.LAWYER)`): a role is granted
 * by being written down, never by belonging to a group that quietly grows. These lists say what
 * those names mean, so a new role can be placed without reading every controller — and
 * `editor-access.spec.ts` walks the router to prove no route disagrees with them.
 */

/**
 * Everything a client owns: cases and their history, documents and document requests, invoices and
 * payments, messages, tasks, testimonials, the client list itself. EDITOR is deliberately absent —
 * an editor writes the firm's articles and has no reason to see who it represents.
 */
export const CLIENT_DATA_ROLES: readonly Role[] = [Role.ADMIN, Role.LAWYER];

/**
 * Staff plus the client whose row it is. Case files, documents, invoices and messages are read by
 * both sides of the same case, and the service narrows it further — a client sees their own case,
 * a lawyer the cases they are on. Written out because "any signed-in user" would quietly include
 * the next role somebody adds, which is exactly how an editor would end up reading a case file.
 */
export const CASE_PARTICIPANT_ROLES = [Role.ADMIN, Role.LAWYER, Role.CLIENT] as const;

/** Who may open the admin panel at all (the portal is for clients). */
export const STAFF_ROLES: readonly Role[] = [Role.ADMIN, Role.LAWYER, Role.EDITOR];

/** Who may write, publish and delete posts. For an EDITOR this is the whole job. */
export const POST_MANAGER_ROLES = [Role.ADMIN, Role.LAWYER, Role.EDITOR] as const;

/** True when the role handles client data; LAWYER is additionally narrowed to their own cases. */
export function handlesClientData(role: Role): boolean {
  return CLIENT_DATA_ROLES.includes(role);
}

/**
 * ADMIN and EDITOR work on every post whoever wrote it; a LAWYER only on their own. Publishing
 * needs no second pair of eyes — the firm hired the editor to decide that.
 */
export function managesEveryPost(role: Role): boolean {
  return role === Role.ADMIN || role === Role.EDITOR;
}

/**
 * The byline is a lawyer, always: a legal text is signed by the person who answers for it. An
 * editor types it and stays out of the byline, which is why the author is chosen, not assumed.
 */
export const BYLINE_ROLE: Role = Role.LAWYER;
