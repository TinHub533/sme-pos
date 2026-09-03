import type { Role } from "./types";

/**
 * Where a role lands after login / at "/". Admin JWTs are scoped to the
 * reserved __system__ shop (see V2 migration), so /dashboard's shop-scoped
 * data is meaningless for them — they go to the shop list instead. Cashiers
 * run the till, not the back office, so they land straight on the POS.
 */
export function roleHomePath(role: Role): string {
  if (role === "ROLE_ADMIN") return "/admin/shops";
  if (role === "ROLE_CASHIER") return "/pos";
  return "/dashboard";
}
