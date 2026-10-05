-- V4: catalog — categories, items, item media, coupons

CREATE TABLE categories (
    id              BIGSERIAL PRIMARY KEY,
    shop_id         BIGINT NOT NULL REFERENCES shops(id),
    name            VARCHAR(255) NOT NULL,
    thumbnail_url   TEXT,
    display_order   INTEGER NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_shop_id ON categories(shop_id);

CREATE TABLE items (
    id                  BIGSERIAL PRIMARY KEY,
    shop_id             BIGINT NOT NULL REFERENCES shops(id),
    category_id         BIGINT NOT NULL REFERENCES categories(id),
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    price_in_paise      BIGINT NOT NULL,
    discount_percentage INTEGER NOT NULL DEFAULT 0,
    stock_quantity      INTEGER NOT NULL DEFAULT 0,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    -- Optimistic lock: guards concurrent stock decrements at checkout time
    -- (cart/checkout epic) so overselling cannot happen under concurrency.
    version             BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_shop_id ON items(shop_id);
CREATE INDEX idx_items_category_id ON items(category_id);

CREATE TABLE item_media (
    id              BIGSERIAL PRIMARY KEY,
    item_id         BIGINT NOT NULL REFERENCES items(id),
    media_url       TEXT NOT NULL,
    media_type      VARCHAR(10) NOT NULL, -- IMAGE | VIDEO
    display_order   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_item_media_item_id ON item_media(item_id);

CREATE TABLE coupons (
    id                  BIGSERIAL PRIMARY KEY,
    shop_id             BIGINT NOT NULL REFERENCES shops(id),
    code                VARCHAR(40) NOT NULL,
    discount_type       VARCHAR(10) NOT NULL, -- PERCENTAGE | FIXED
    discount_value      BIGINT NOT NULL,      -- percent (0-100) or paise, per discount_type
    min_order_amount    BIGINT NOT NULL DEFAULT 0,
    max_uses            INTEGER,
    used_count          INTEGER NOT NULL DEFAULT 0,
    valid_from          TIMESTAMPTZ,
    valid_to            TIMESTAMPTZ,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (shop_id, code)
);

CREATE INDEX idx_coupons_shop_id ON coupons(shop_id);
