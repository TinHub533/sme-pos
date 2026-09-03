// Client-side counterpart to lib/api.ts's server-only apiFetch(). Every
// interactive component (POS, product/staff forms, void/suspend buttons)
// was hand-rolling the same `fetch` + `if (!res.ok) throw new Error(...)`
// block, and none of them handled the JWT expiring mid-session (60 min per
// application.yml's jwt.expiration-minutes) — a cashier mid-shift would
// just see whatever raw error message came back from the Route Handler,
// with no indication they needed to sign in again.
//
// Deliberately NOT used by the login/onboarding forms: a 401 there means
// "wrong credentials", not "your session expired", and must never trigger
// this redirect.

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function redirectToLogin() {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  // Full navigation, not router.push(): this clears all in-memory React
  // state (cart, form drafts, poll timers) along with the stale session,
  // rather than leaving a half-authenticated page mounted underneath.
  window.location.href = `/login?next=${next}`;
}

/**
 * Calls one of our own /api/** Route Handlers. Throws ApiRequestError on any
 * non-OK response; on a 401 it also redirects to /login first. `fallback` is
 * the message shown when the response body has no `message` field of its
 * own — matching what each call site already used before this helper.
 */
export async function apiRequest<T = undefined>(
  input: string,
  init: RequestInit | undefined,
  fallback: string,
): Promise<T> {
  const res = await fetch(input, init);

  if (res.status === 401) {
    redirectToLogin();
    throw new ApiRequestError(401, "Your session has expired. Redirecting to sign in…");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiRequestError(res.status, body?.message ?? fallback);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
