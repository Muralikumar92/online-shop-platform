-- V3: subscription plans & payments

CREATE TABLE subscription_plans (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    price_in_paise  BIGINT NOT NULL,
    duration_days   INTEGER NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO subscription_plans (name, price_in_paise, duration_days, active) VALUES
    ('Monthly', 99900, 30, TRUE),
    ('Yearly', 999900, 365, TRUE);

CREATE TABLE subscription_payments (
    id                  BIGSERIAL PRIMARY KEY,
    shop_id             BIGINT NOT NULL REFERENCES shops(id),
    plan_id             BIGINT NOT NULL REFERENCES subscription_plans(id),
    razorpay_order_id   VARCHAR(64) NOT NULL UNIQUE,
    razorpay_payment_id VARCHAR(64),
    amount_in_paise     BIGINT NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_payments_shop_id ON subscription_payments(shop_id);
