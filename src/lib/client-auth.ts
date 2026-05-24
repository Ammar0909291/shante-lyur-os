'use client';

/**
 * Client-side auth helpers.
 *
 * The JWT access_token cookie is httpOnly — JavaScript cannot read it.
 * Auth routes set two readable companion cookies:
 *   user_role  — the user's role string (e.g. "SUPER_ADMIN")
 *   user_id    — the user's UUID
 *
 * Use these instead of trying to decode the JWT.
 */

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}

export function getClientRole(): string {
  return readCookie('user_role');
}

export function getClientUserId(): string {
  return readCookie('user_id');
}

/** Returns { role, userId } parsed from the readable cookies. */
export function getClientSession(): { role: string; userId: string } {
  return { role: getClientRole(), userId: getClientUserId() };
}

/** Auth headers for fetch() calls from client components. */
export function authHeaders(): Record<string, string> {
  const { role, userId } = getClientSession();
  return {
    'x-user-id':   userId || 'system',
    'x-user-role': role   || 'ADMIN',
  };
}
