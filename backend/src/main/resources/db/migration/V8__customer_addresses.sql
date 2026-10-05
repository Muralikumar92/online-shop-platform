-- V8: saved customer addresses (reusable across orders, with a default)

CREATE TABLE customer_addresses (
    id             BIGSERIAL PRIMARY KEY,
    customer_id    BIGINT NOT NULL REFERENCES customers(id),
    label          VARCHAR(64),
    full_name      VARCHAR(255) NOT NULL,
    phone          VARCHAR(32) NOT NULL,
    address_line1  VARCHAR(255) NOT NULL,
    address_line2  VARCHAR(255),
    city           VARCHAR(128) NOT NULL,
    state          VARCHAR(128) NOT NULL,
    pincode        VARCHAR(16) NOT NULL,
    is_default     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);
