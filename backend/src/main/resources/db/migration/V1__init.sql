CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE shops (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(255) NOT NULL,
    currency_default VARCHAR(3)   NOT NULL DEFAULT 'USD',
    active           BOOLEAN      NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE app_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id       UUID NOT NULL REFERENCES shops(id),
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN', 'OWNER', 'CASHIER')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_users_shop ON app_users(shop_id);

CREATE TABLE products (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id    UUID NOT NULL REFERENCES shops(id),
    sku        VARCHAR(64)  NOT NULL,
    name       VARCHAR(255) NOT NULL,
    price_khr  NUMERIC(18,2),
    price_usd  NUMERIC(18,2),
    category   VARCHAR(100),
    active     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (shop_id, sku)
);
CREATE INDEX idx_products_shop ON products(shop_id);

CREATE TABLE inventory (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id         UUID NOT NULL UNIQUE REFERENCES products(id),
    qty_on_hand        INTEGER NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
    reorder_threshold  INTEGER NOT NULL DEFAULT 0,
    version            BIGINT  NOT NULL DEFAULT 0
);

CREATE TABLE orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id           UUID NOT NULL REFERENCES shops(id),
    cashier_id        UUID NOT NULL REFERENCES app_users(id),
    status            VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','PAID','VOID')),
    total             NUMERIC(18,2) NOT NULL DEFAULT 0,
    fx_rate_snapshot  NUMERIC(18,6),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_shop ON orders(shop_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_items (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id               UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id             UUID NOT NULL REFERENCES products(id),
    qty                    INTEGER NOT NULL CHECK (qty > 0),
    unit_price_snapshot    NUMERIC(18,2) NOT NULL,
    product_name_snapshot  VARCHAR(255) NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE payments (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id  UUID NOT NULL UNIQUE REFERENCES orders(id),
    method    VARCHAR(10) NOT NULL CHECK (method IN ('CASH','BANK','KHQR')),
    khqr_ref  VARCHAR(128) UNIQUE,
    status    VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stock_movements (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    created_by UUID NOT NULL REFERENCES app_users(id),
    type       VARCHAR(10) NOT NULL CHECK (type IN ('SALE','RESTOCK','ADJUSTMENT')),
    qty        INTEGER NOT NULL,
    reason     VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);

CREATE TABLE daily_closings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id       UUID NOT NULL REFERENCES shops(id),
    closing_date  DATE NOT NULL,
    total_sales   NUMERIC(18,2) NOT NULL DEFAULT 0,
    cash_counted  NUMERIC(18,2),
    variance      NUMERIC(18,2),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (shop_id, closing_date)
);

-- ADMIN users aren't scoped to a single shop, but app_users.shop_id is
-- NOT NULL — platform admins get a reserved "system" shop row to satisfy
-- the FK instead of nullable-ifying a column every shop-scoped query relies
-- on. ShopService excludes this row from the admin shop list and refuses to
-- suspend it (suspending it would lock every admin out of login).
INSERT INTO shops (id, name, currency_default, active)
VALUES ('00000000-0000-0000-0000-000000000000', '__system__', 'USD', true);
