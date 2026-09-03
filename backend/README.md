# SME POS + Inventory API

Backend API for small retailers: catalog, inventory with
concurrency-safe stock decrements, cash/bank/KHQR checkout, daily cash
reconciliation, and platform-admin shop management.

## Stack
- Spring Boot 3.3 (Web, Data JPA, Security, Validation, Actuator)
- PostgreSQL + Flyway (`V1__init.sql` — squashed from the original
  incremental history since this project has no shared git history to
  preserve, see the comments in that file for what it folds together —
  plus `V2__add_admin_mfa.sql` and `V3__add_audit_log.sql`, normal forward
  migrations; the squash was a one-time cleanup, not an ongoing pattern)
- JWT auth (stateless, role-based: `ADMIN` / `OWNER` / `CASHIER`), with
  optional TOTP MFA for `ADMIN` accounts
- Testcontainers for a real-Postgres concurrency integration test; RFC
  test-vector unit tests for the hand-rolled Base32/TOTP implementation
- OpenAPI/Swagger UI (springdoc) at `/swagger-ui/index.html`, spec at
  `/v3/api-docs` — both public, auto-generated from the controllers

Not included yet (intentionally deferred): outbox pattern / Spring Events
for the KHQR webhook → downstream notification fan-out.

## Running locally

**Docker (whole stack):** see the root [README](../README.md) — `tools/postgresql/`
then the root `docker-compose.yml` builds and runs this service in a container.

**Directly on the JVM** (faster edit/reload loop than rebuilding an image):
```
docker compose -f ../tools/postgresql/docker-compose.yml up -d   # Postgres only
mvn spring-boot:run
```
Flyway applies `V1__init.sql` automatically on boot — no manual schema setup.

There's no seed data: create your first account via `POST /onboarding/shop`
(a shop + its Owner in one call — the frontend's `/onboarding` page is the
easiest way to do this) or `POST /admin/bootstrap` for the first platform
`ADMIN` account (only works once, while no admin exists yet — the
frontend's `/admin-setup` page wraps this).

## Running tests

```
mvn test      # unit tests
mvn verify    # also runs *IT integration tests (needs a Docker daemon — Testcontainers)
```

`InventoryConcurrencyIT` spins up a real Postgres container via
Testcontainers and fires 20 concurrent sales against 10 units of stock to
prove the pessimistic-lock decrement in `InventoryService` never oversells
and never lets stock go negative. `CheckoutAndBootstrapConcurrencyIT` (same
Testcontainers approach) covers three more races: double-checkout of the
same order, a KHQR webhook replayed genuinely simultaneously (not just
sequentially), and concurrent `/admin/bootstrap` attempts — see "Key design
decisions" below for two real bugs this found and fixed, not just
theorized about.

Note: Testcontainers needs a real Docker daemon reachable the way its
Java client expects — this works in CI (GitHub-hosted runners) but *not*
in whatever sandbox this project has been developed in so far, where
`docker`/`docker compose` work fine via the CLI but Testcontainers' own
client can't connect. Both `*IT` classes were verified correct a different
way when that happened: driving the exact same scenarios as genuine
concurrent HTTP requests against a real running instance (see the
"Key design decisions" bugs below, both found this way) — a real substitute
for the one time it mattered, not a replacement for actually fixing
Testcontainers access in an environment that has it.

## API surface

- **Auth / onboarding**: `POST /auth/login` (public — accepts an optional
  `mfaCode`, required only if the account has MFA enabled), `POST
  /auth/change-password` (authenticated, any role — self-service, requires
  the current password), `POST /onboarding/shop` (public, creates a shop +
  first Owner, auto-logs in).
- **MFA** (`ADMIN`-only, opt-in TOTP): `GET /auth/mfa/status`, `POST
  /auth/mfa/enroll` (generates a secret + `otpauth://` URI for QR
  rendering, doesn't enable MFA yet), `POST /auth/mfa/confirm` (proves a
  real code came back, flips MFA on), `POST /auth/mfa/disable` (requires
  a valid current code).
- **Health/ops**: `GET /actuator/health` and `/actuator/health/{liveness,readiness}`
  (public, UP/DOWN only), `GET /actuator/health` with an `ADMIN` token
  (full component details), `GET /actuator/info` (public, app name/version).
- **Admin bootstrap**: `GET/POST /admin/bootstrap` (public, one-time — creates
  the first `ADMIN` account and auto-logs in; refuses once any admin
  exists), `GET/POST /admin/users` (`ADMIN`-only, add further admins).
- **Platform admin**: `GET /admin/shops`, `GET /admin/shops/{id}`,
  `POST /admin/shops/{id}/suspend|reactivate` (`ADMIN`-only). The reserved
  `__system__` shop that admin accounts are tied to is excluded from the
  list and can't be suspended — see `ShopService`.
- **Catalog / inventory**: `GET/POST /products`, `POST /inventory/{productId}/restock|adjust`,
  `GET /products/low-stock/export` (`OWNER`-only, CSV — current snapshot,
  no date range).
- **Orders / checkout**: `GET/POST /orders`, `POST /orders/{id}/items`,
  `POST /orders/{id}/checkout` (method: `CASH` / `BANK` / `KHQR`),
  `POST /orders/{id}/void`, `GET /orders/{id}/receipt`,
  `GET /orders/export?from=&to=` (`OWNER`-only, CSV, defaults to the
  trailing 30 days).
- **KHQR webhook**: `POST /webhooks/khqr/payment-confirm` — HMAC-SHA256
  signed, idempotent on `khqrRef`.
- **Daily closing**: `GET /daily-closings/{date}`, `POST /daily-closings/{date}/reconcile`,
  `GET /daily-closings/export?from=&to=` (`OWNER`-only, CSV, defaults to
  the trailing 30 days).
- **Staff**: `GET/POST /users` (`OWNER`-only, manages that shop's Cashiers),
  `POST /users/{id}/reset-password` (`OWNER`-only, resets a Cashier in
  their own shop).
- **Password reset (admin/owner-initiated, not self-service)**:
  `POST /admin/users/{id}/reset-password` (`ADMIN`-only, resets another
  admin), `POST /admin/shops/{id}/reset-owner-password` (`ADMIN`-only,
  resets a shop's Owner — the platform-support case). See the "not yet
  built" note below on why this isn't self-service yet.
- **Audit log** (`ADMIN`-only, paginated): `GET /admin/audit-log` — every
  shop suspend/reactivate, admin creation/bootstrap, and admin/owner
  password reset, written in the same transaction as the action itself
  (see `AuditLogService`). Owner-level actions (Cashier creation, Owner
  resets a Cashier's password) aren't audited — scoped to `ADMIN` actions
  only, matching what was actually asked for.
- **Dashboard**: `GET /dashboard/summary`.

## Key design decisions

- **Multi-tenant via `shop_id` column**, not schema-per-tenant — simpler
  to explain and query, appropriate for this scale.
- **Price/fx snapshots on `OrderItem`/`Order`** (`unitPriceSnapshot`,
  `productNameSnapshot`) — historical orders and receipts never drift when
  a product's price or name changes later.
- **Stock movements are an append-only ledger**, not just a mutable
  `qty_on_hand` — gives an audit trail for "why is stock at this number."
- **`InventoryService.decrementForSale` runs in `REQUIRES_NEW`** with a
  `SELECT ... FOR UPDATE` row lock, so the lock is held only for that call,
  not for the whole `addItem` transaction. Tradeoff documented in
  `OrderService.addItem`'s Javadoc: if a later step in the outer
  transaction fails, the decrement doesn't auto-rollback — `restock()` is
  the explicit compensating action, used today only in `voidOrder`.
- **Three payment methods, tracked separately**: `CASH`, `BANK` (customer
  scans the shop's own physical counter QR, cashier confirms with one
  click — same interaction as cash, kept as its own method purely for
  bookkeeping granularity), and `KHQR` (per-order dynamic QR + webhook).
  KHQR webhook confirmation is idempotent — replaying the same `khqrRef`
  is a no-op past the first confirm, checked and updated inside one
  transaction to close the replay race.
- **ADMIN accounts use a reserved `__system__` shop row** (`shop_id`
  `00000000-0000-0000-0000-000000000000`) rather than a nullable
  `shop_id` or a separate admin-accounts table — `app_users.shop_id` stays
  NOT NULL and every shop-scoped query stays untouched. `ShopService`
  excludes this row from the admin-facing shop list and refuses to
  suspend it (suspending it would lock every admin out of login, since
  `AuthService.login()` re-checks the caller's shop is active).
- **Order lookups are shop-scoped** — every `OrderService` method that
  fetches an order goes through `requireOrderInShop`, which checks
  `order.getShopId()` against the caller's JWT-derived shop and returns
  a 404 (not a 403) on mismatch, so a guessed order ID from another shop
  is indistinguishable from one that never existed.
- **A shop suspension revokes already-issued JWTs immediately, not just at
  next login** — `UserPrincipal.isEnabled()` is repurposed to mean "this
  user's shop is active," recomputed by `CustomUserDetailsService` on
  *every* authenticated request (not cached), since `JwtAuthenticationFilter`
  re-resolves the user per-request rather than trusting a cached identity.
  Login goes through this same flag automatically (Spring Security's
  `DaoAuthenticationProvider` rejects a disabled `UserDetails` via
  `DisabledException` before even comparing the password — folded into the
  same generic "Invalid username or password" as a wrong password, so the
  two stay indistinguishable). `JwtAuthenticationFilter` has to check it
  explicitly too, since it builds the `Authentication` directly and skips
  `AuthenticationManager` (and therefore Spring's usual automatic checks)
  entirely.
- **MFA is hand-rolled TOTP (RFC 6238) + Base32 (RFC 4648), not a
  dependency** — `security.Totp`/`Base32`, verified against each RFC's own
  official test vectors in `TotpTest`/`Base32Test` rather than just
  "looks plausible," which is what actually justifies not reaching for a
  library for something security-critical. Opt-in and `ADMIN`-only:
  `mfa_enabled` stays false for every account until `/auth/mfa/confirm`
  proves a real code came back from a secret just issued by `/enroll`, so
  enrolling alone never risks locking anyone out. Accepts a code from the
  current 30s step or one step either side, for clock drift.
- **Rate limiting is per-IP+path, in-memory, no external store** —
  `RateLimitInterceptor` limits `/auth/login` (10/60s) and
  `/webhooks/khqr/payment-confirm` (30/60s) before the request reaches the
  controller (a limited login attempt never even hits the BCrypt check).
  Deliberately in-process (`RateLimiter`, a `ConcurrentHashMap`-backed
  fixed window with opportunistic cleanup) rather than Redis-backed — this
  runs as a single instance today; revisit if that changes. Reads
  `getRemoteAddr()` by default; set `APP_TRUST_PROXY_HEADERS=true` to
  trust `X-Forwarded-For` from `tools/nginx/` instead (taking the *last*
  comma-separated entry specifically — the one nginx itself appended,
  since nginx's `$proxy_add_x_forwarded_for` appends to whatever a client
  already sent, making any earlier entry spoofable; verified live that a
  forged leading entry doesn't bypass the limit). Off by default even with
  nginx in the picture, since root `docker-compose.yml` still publishes
  the backend's 8080 directly for local dev — flip it on only once 8080 is
  genuinely unreachable except via nginx. One honest limitation, not
  glossed over: this only meaningfully protects `/webhooks/khqr/payment-confirm`
  (nginx is a real single-hop front door there). `/auth/login` traffic
  reaches this backend via the frontend's own server-to-server proxy over
  the internal Docker network, which never goes back through nginx and
  doesn't forward the original client IP — so that limit is effectively
  one shared bucket for the whole app's login traffic today, not
  per-attacker. See `RateLimitInterceptor`'s class Javadoc for the full
  reasoning.
- **Audit log lives in the same Postgres database as everything else, not
  a separate store** — deliberately, so `AuditLogService.record(...)` can
  be called from inside the *same* `@Transactional` method as the action
  it's logging (`ShopService.setActive`, `AdminUserService.createAdmin`,
  etc.), committing or rolling back atomically with it. A separate
  database (Mongo or otherwise) would need a distributed write here,
  risking an action recorded with no audit trail or vice versa — not worth
  it for a uniform, simply-shaped record at this scale. `actor_username`
  is a snapshot column (same reasoning as `unitPriceSnapshot`/
  `productNameSnapshot`), not a join, so an entry always shows who did it
  *at the time*.
- **CSV export is hand-rolled RFC 4180 escaping (`util.Csv`), not a
  dependency** — one well-specified rule (quote a field and double any
  embedded quotes, only if it contains a comma/quote/newline), covered by
  real unit tests including a round-trip through Python's own `csv`
  parser during manual verification, not just eyeballed output. Reused
  across all three export endpoints via `Csv.download(...)` rather than
  each controller building its own `ResponseEntity` headers.
- **Two real concurrency bugs found and fixed by writing the tests, not just
  theorized about** (`CheckoutAndBootstrapConcurrencyIT`, verified live via
  real concurrent HTTP requests when Testcontainers itself wasn't reachable
  in this sandbox — see "Running tests" above):
  1. Concurrent checkouts racing on the *same* order correctly left only
     one `Payment` row (the `payments.order_id` UNIQUE constraint already
     guaranteed that), but the losing requests surfaced as a raw 500
     (`DataIntegrityViolationException` with no handler) instead of a
     clean 409. Fixed with a `GlobalExceptionHandler` entry — deliberately
     a fixed, generic message rather than `e.getMessage()`, since that
     exception's message includes the raw SQL and constraint name.
  2. `PaymentWebhookController`'s own comment claimed replaying the same
     `khqrRef` concurrently "can't both pass the check before either
     writes" — false under real concurrency: a plain `findByKhqrRef` read
     let every concurrent replay see `PENDING` and all report back
     `"confirmed"` (10 threads, 10 "confirmed" replies, proven live before
     the fix). `PaymentRepository.findByKhqrRefForUpdate` (a pessimistic
     row lock, same pattern as `InventoryRepository.findByProductIdForUpdate`)
     closes it — the second-and-later requests now block until the first
     commits, then correctly see `CONFIRMED` and no-op.
  3. `AdminUserService.bootstrap()`'s `existsByRole(ADMIN)` check had the
     same shape of bug — no lock between the check and the write, so
     concurrent bootstrap attempts could both see zero admins and both
     succeed. Fixed with a Postgres advisory transaction lock
     (`pg_advisory_xact_lock`, held for the transaction's duration,
     released automatically at commit/rollback) rather than a schema
     change, since this is a one-off "only the very first caller should
     win" case, not a resource with ongoing contention.
- **`com.smepos` logging defaults to INFO, not DEBUG** — nothing in this
  codebase calls `.debug(...)` today, so this was a no-op hardcoded
  setting rather than an active leak, but leaving DEBUG as the permanent
  default meant the day someone adds a debug log line while
  troubleshooting (e.g. the JWT/auth flow), it would ship straight to
  production at that verbosity with no separate opt-in. Set
  `LOG_LEVEL_COM_SMEPOS=DEBUG` locally when you actually need it.

## Not yet built

- Self-service "forgot password" (email/SMS a reset link/code) for when
  you're actually locked out. Two other password paths already exist and
  cover different cases: `POST /auth/change-password` (self-service, but
  requires knowing your *current* password — for "I want to update it,"
  not "I lost it") and the admin/owner-*initiated* resets (`POST
  /users/{id}/reset-password` etc. — for when you're locked out but
  someone above you can vouch for you). Neither helps a user who's locked
  out with nobody above them to ask (e.g. the sole admin). True
  self-service-when-locked-out needs real email/SMS delivery
  infrastructure this project doesn't have configured — same category of
  "needs external provider credentials before it can be built for real"
  as the KHQR gateway below, not something to fake.
- Real KHQR gateway integration — today's `KHQR` checkout generates a
  per-order QR and accepts a signed webhook, but doesn't speak to an
  actual provider (ABA PayWay/Wing/ACLEDA/Bakong). That needs the
  operator's own merchant registration before it can be wired up for
  real; faking the payload format would look done but silently fail to
  scan.
- Outbox pattern for reliably fanning out "order paid" events.
- ESC/POS bridge for raw network/serial thermal printers (Epson ePOS,
  Star WebPRNT, QZ Tray) — the current receipt view supports any
  OS-driver-based printer (USB/Bluetooth thermal, regular) via the
  browser's print dialog, which is deliberately as far as this goes for
  now; a raw network/serial bridge is a real infra decision (which
  provider, what auth) to make only once actually needed.
