-- ADMIN-action audit trail. actor_username is a snapshot (same reasoning as
-- unit_price_snapshot/product_name_snapshot elsewhere) — an entry should
-- show who did this AT THE TIME, not require a join that could show a
-- different value if the actor's username were ever changed later.
CREATE TABLE audit_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id       UUID NOT NULL REFERENCES app_users(id),
    actor_username VARCHAR(100) NOT NULL,
    action         VARCHAR(100) NOT NULL,
    target_type    VARCHAR(50),
    target_id      VARCHAR(100),
    detail         VARCHAR(500),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
