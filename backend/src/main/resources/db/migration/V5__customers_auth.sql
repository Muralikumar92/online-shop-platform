-- V5: customers (per-shop accounts) and their auth tokens/OTPs

CREATE TABLE customers (
    id            BIGSERIAL PRIMARY KEY,
    shop_id       BIGINT NOT NULL REFERENCES shops(id),
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    phone         VARCHAR(32),
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (shop_id, email)
);

CREATE TABLE customer_password_reset_tokens (
    id          BIGSERIAL PRIMARY KEY,
    token       VARCHAR(128) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_password_reset_tokens_customer_id ON customer_password_reset_tokens(customer_id);

CREATE TABLE customer_login_otps (
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    code        VARCHAR(6) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_login_otps_customer_id ON customer_login_otps(customer_id);
