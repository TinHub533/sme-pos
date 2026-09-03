import { getToken } from "./session";
import type { ApiErrorBody } from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  body?: ApiErrorBody;
  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Server-only fetch wrapper for calling the Spring Boot backend directly
 * from Server Components — attaches the Bearer token from the httpOnly
 * cookie automatically. Client Components should NOT import this; they
 * don't have access to the httpOnly cookie by design (that's the point
 * of httpOnly) and should go through a Route Handler instead when they
 * need to mutate something.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store", // dashboard/order data is always live, never cached
  });

  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = await res.json();
    } catch {
      // backend didn't return JSON (e.g. a raw 401 from the security filter)
    }
    throw new ApiError(res.status, body?.message ?? res.statusText, body);
  }

  // 204 No Content etc.
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
