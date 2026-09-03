import type { Session } from "./types";

/**
 * Decodes the JWT payload WITHOUT verifying the signature. This is
 * deliberate and safe here: the token only ever reaches this code after
 * arriving from our own Route Handler (which got it straight from the
 * backend over a trusted server-to-server call) or being read back from
 * our own httpOnly cookie. We're not accepting tokens from anywhere an
 * attacker could forge one.
 *
 * This decode is for UI/routing decisions only (which nav to show, which
 * route group to allow into) — it is NOT the security boundary. Every
 * actual data-access check happens again on the backend via
 * @PreAuthorize and the shop-scoping in OrderService. Losing this file
 * would only affect what the frontend shows, never what a user can
 * actually do.
 */
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  // atob, not Buffer: this file is imported by middleware.ts, which runs
  // in the Edge runtime where Buffer isn't reliably available. atob is
  // global in both the Edge runtime and Node 18+, so it's the portable
  // choice here even though Buffer would be more idiomatic Node.
  return atob(padded);
}

export function decodeSession(token: string): Session | null {
  try {
    const payload = token.split(".")[1];
    const json = base64UrlDecode(payload);
    const claims = JSON.parse(json);
    return {
      username: claims.sub,
      role: claims.role,
      shopId: claims.shopId,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}

export function isExpired(session: Session): boolean {
  return session.exp * 1000 < Date.now();
}
