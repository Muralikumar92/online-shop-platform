-- V6: orders & order_items (checkout, payments, shipping snapshot)

CREATE TABLE orders (
    id                      BIGSERIAL PRIMARY KEY,
    shop_id                 BIGINT NOT NULL REFERENCES shops(id),
    customer_id             BIGINT NOT NULL REFERENCES customers(id),
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING_PAYMENT',
    subtotal_in_paise       BIGINT NOT NULL,
    discount_in_paise       BIGINT NOT NULL DEFAULT 0,
    total_in_paise          BIGINT NOT NULL,
    coupon_code             VARCHAR(64),
    razorpay_order_id       VARCHAR(128),
    razorpay_payment_id     VARCHAR(128),
    shipping_full_name      VARCHAR(255) NOT NULL,
    shipping_phone          VARCHAR(32) NOT NULL,
    shipping_address_line1  VARCHAR(255) NOT NULL,
    shipping_address_line2  VARCHAR(255),
    shipping_city           VARCHAR(100) NOT NULL,
    shipping_state          VARCHAR(100) NOT NULL,
    shipping_pincode        VARCHAR(16) NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at);
CREATE INDEX idx_orders_razorpay_order_id ON orders(razorpay_order_id);

CREATE TABLE order_items (
    id                          BIGSERIAL PRIMARY KEY,
    order_id                    BIGINT NOT NULL REFERENCES orders(id),
    item_id                     BIGINT NOT NULL REFERENCES items(id),
    item_name_snapshot          VARCHAR(255) NOT NULL,
    unit_price_in_paise_snapshot BIGINT NOT NULL,
    quantity                    INT NOT NULL,
    line_total_in_paise         BIGINT NOT NULL
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
