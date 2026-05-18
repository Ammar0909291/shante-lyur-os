/**
 * apiFetch — drop-in replacement for fetch() that:
 *   1. Always sends credentials (cookies) for same-origin requests
 *   2. On 401: attempts a silent token refresh, then retries once
 *   3. If refresh fails: redirects the browser to /login
 *
 * Multiple concurrent 401s will share a single refresh attempt (deduplication).
 */

let pendingRefresh: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })
    .then(r => r.ok)
    .catch(() => false)
    .finally(() => {
      pendingRefresh = null;
    });

  return pendingRefresh;
}

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const opts: RequestInit = { credentials: 'include', ...init };
  const res = await fetch(input, opts);

  if (res.status !== 401) return res;

  // Token expired — attempt silent refresh
  const refreshed = await attemptRefresh();

  if (refreshed) {
    // Retry original request with the new access_token cookie
    return fetch(input, opts);
  }

  // Refresh failed — session is gone, redirect to login
  if (typeof window !== 'undefined') {
    const current = window.location.pathname;
    const loginUrl = current && current !== '/login'
      ? `/login?redirect=${encodeURIComponent(current)}`
      : '/login';
    window.location.href = loginUrl;
  }

  return res; // Returning the 401 response — caller is navigating away
}
