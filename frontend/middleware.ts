import { NextRequest, NextResponse } from "next/server";
import { decodeSession, isExpired } from "@/lib/jwt";
import { roleHomePath } from "@/lib/roles";

const SESSION_COOKIE = "sme_pos_token";

// Routes that require a logged-in session. Extend this list as more
// screens get built.
const PROTECTED_PREFIXES = ["/dashboard", "/products", "/orders", "/closing", "/pos", "/staff", "/admin"];

// Mirrors the backend's @PreAuthorize("hasRole('OWNER')") on
// DailyClosingController and StaffController — a Cashier's JWT would get a
// 403 from the API on these, so keep them out of the UI too rather than
// showing a dead-end nav link that always errors. /products and /orders stay
// open to Cashier here since their read/void endpoints have no role
// restriction on the backend (only the mutating product/inventory endpoints
// do, which the pages themselves hide per-role — see products/page.tsx).
const OWNER_ONLY_PREFIXES = ["/closing", "/staff"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? decodeSession(token) : null;

  if (!session || isExpired(session)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /admin/** is Admin-only (mirrors @PreAuthorize("hasRole('ADMIN')") on
  // AdminController); everything else here is shop-scoped and meaningless
  // for an Admin, whose JWT is tied to the reserved __system__ shop.
  const isAdminRoute = pathname.startsWith("/admin");
  if (isAdminRoute !== (session.role === "ROLE_ADMIN")) {
    return NextResponse.redirect(new URL(roleHomePath(session.role), req.url));
  }

  const isOwnerOnlyRoute = OWNER_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (isOwnerOnlyRoute && session.role === "ROLE_CASHIER") {
    return NextResponse.redirect(new URL(roleHomePath(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/orders/:path*",
    "/closing/:path*",
    "/pos/:path*",
    "/staff/:path*",
    "/admin/:path*",
  ],
};
