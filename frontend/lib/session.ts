import { cookies } from "next/headers";
import { decodeSession, isExpired } from "./jwt";
import type { Session } from "./types";

export const SESSION_COOKIE = "sme_pos_token";

/** Server-only. Reads the httpOnly cookie and decodes it into a Session. */
export function getSession(): Session | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = decodeSession(token);
  if (!session || isExpired(session)) return null;
  return session;
}

export function getToken(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}
