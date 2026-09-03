# SME POS — Frontend

Next.js 14 (App Router) frontend for the SME POS backend.

## Setup

```
cp .env.local.example .env.local   # set BACKEND_URL if not localhost:8080
npm install
npm run dev
```

(Or run the whole stack in Docker — see the root [README](../README.md).)

## Auth model

- Login/onboarding/admin-bootstrap go through Route Handlers
  (`app/api/auth/login`, `app/api/onboarding`, `app/api/admin/bootstrap`)
  which call the Spring Boot backend server-to-server and set the JWT as an
  **httpOnly** cookie. The browser JS never sees the raw token. Every other
  client-side mutation goes through its own `app/api/**` Route Handler the
  same way (`lib/clientFetch.ts` is the shared client-side caller —
  redirects to `/login` on a real 401, i.e. an expired session, distinct
  from a wrong-credentials 401 on the login form itself). `ChangePasswordButton`
  and the MFA confirm/disable calls in `MfaPanel` are the other exceptions
  besides login: a wrong current password, or a wrong MFA code, also
  legitimately 401s without meaning "your session expired," so each calls
  its Route Handler with a raw `fetch`, not `apiRequest`.
- `LoginForm` handles a second round trip for MFA-enabled accounts: a
  401 with the exact body `{"message": "MFA_REQUIRED"}` (a stable value
  the backend guarantees, not prose to pattern-match — see
  `AuthDtos.LoginRequest`'s comment) swaps the form to a code-only step
  and resubmits the already-entered username/password alongside the code
  on the next attempt.
- `lib/session.ts` (server-only) reads that cookie in Server Components;
  `lib/api.ts` attaches it as a Bearer token when calling the backend
  directly from Server Components.
- `middleware.ts` decodes the cookie (unverified — see the comment in
  `lib/jwt.ts` for why that's safe here) to redirect unauthenticated
  requests, and requests to the wrong role's routes, away before they
  render. **This is a UX convenience, not the real security boundary** —
  every actual permission check still happens on the backend
  (`@PreAuthorize`, shop-scoping in `OrderService`). Losing or bypassing
  the frontend check would only change what's *shown*, never what's
  *allowed*.
- Three role-scoped route groups: `(owner)` (Owner + Cashier, some pages
  further owner-only — see `middleware.ts`'s `OWNER_ONLY_PREFIXES`),
  `(admin)` (platform Admin), plus public routes (`/login`, `/onboarding`,
  `/admin-setup`).

## What's built

- **Public**: `/login`, `/onboarding` (shop + first Owner account),
  `/admin-setup` (one-time first-ADMIN bootstrap — shows an
  "already set up" state once any admin exists).
- **Owner/Cashier** (`(owner)` route group): `/dashboard`, `/pos` (cart,
  cash/bank/KHQR checkout, receipt printing), `/products` (catalog +
  inventory restock/adjust), `/orders` (list + per-order receipt view),
  `/closing` (daily cash reconciliation, Owner-only), `/staff`
  (Cashier account management, Owner-only).
- **Admin** (`(admin)` route group): `/admin/shops` (list + detail +
  suspend/reactivate + reset that shop's Owner password), `/admin/admins`
  (list + add further admin accounts + reset another admin's password),
  `/admin/security` (enroll/disable TOTP MFA on the caller's own account —
  QR code via the `qrcode` package, same as the KHQR checkout QR),
  `/admin/audit-log` (paginated — shop suspend/reactivate, admin
  creation, and admin/owner password resets).
- **Password management**: `ChangePasswordButton` (self-service, any
  role — header of both `(owner)` and `(admin)` layouts, requires the
  current password) and `ResetPasswordButton` (shared component behind
  Owner→Cashier on `/staff`, Admin→Admin on `/admin/admins`, and
  Admin→shop-Owner on `/admin/shops/[shopId]` — no current-password proof,
  since the caller is a privileged third party acting on someone else's
  account, not proving they still know their own).
- Loading states via Next.js's native `loading.tsx` per-route-segment
  Suspense convention (no client-side spinner state), pagination on
  Products/Orders, KHR/USD formatting, session-expiry redirect, and a
  print-responsive receipt view (works down to 58mm thermal paper).
- ESLint configured; Playwright e2e suite in `e2e/` covering auth, POS
  checkout (cash/bank/KHQR), cashier route restrictions, and receipts
  (`npm run test:e2e`).

## What's not built yet

- Real KHQR QR payload / gateway integration — see the note in
  `backend/README.md`; needs the operator's own merchant registration
  with a provider before it can be built for real.
- ESC/POS thermal-printer bridge (for printers that don't expose
  themselves as a normal OS-printable device) — deferred by choice, not
  an oversight; the current browser-print + responsive-CSS receipt covers
  driver-based USB/Bluetooth thermal printers already.

**Deliberately not built** (not a gap): barcode-scanner input on `/pos` —
this app targets tap-to-add-from-a-menu-grid retail (restaurants,
coffee shops), not high-SKU scanning use cases. If it ever comes back,
the intended shape is piggybacking on the existing search box (exact SKU
match + Enter), not a separate feature.
