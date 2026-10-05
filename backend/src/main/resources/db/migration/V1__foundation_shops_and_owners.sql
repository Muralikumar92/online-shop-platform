-- V1: platform foundation — shop owners (merchants) and shops (tenants)

CREATE TABLE shop_owners (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shops (
    id                      BIGSERIAL PRIMARY KEY,
    slug                    VARCHAR(63) NOT NULL UNIQUE,
    name                    VARCHAR(255) NOT NULL,
    logo_url                TEXT,
    owner_id                BIGINT NOT NULL REFERENCES shop_owners(id),
    subscription_status     VARCHAR(20) NOT NULL DEFAULT 'TRIAL',
    subscription_expires_on DATE,
    bank_account_name       VARCHAR(255),
    bank_account_number     VARCHAR(64),
    bank_ifsc_code          VARCHAR(16),
    active                  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shops_owner_id ON shops(owner_id);
