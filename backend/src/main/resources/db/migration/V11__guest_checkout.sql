-- V11: guest checkout (no signup/login/email/OTP required)
-- A customer can place an order request without an account. We still create
-- a lightweight "guest" customer row (is_guest=true) so the rest of the
-- order model (Order.customer, ownership checks, etc.) stays unchanged -
-- it just has no email/password and is identified instead by a device
-- cookie (so a browser has at most one open guest order) and the order's
-- own opaque tracking token (shared with the shop owner, used to view
-- status without logging in).

ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE customers ADD COLUMN is_guest BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN guest_device_token VARCHAR(64);

CREATE INDEX idx_customers_guest_device_token ON customers(shop_id, guest_device_token) WHERE guest_device_token IS NOT NULL;

-- Guest orders start as REQUESTED: no stock is touched yet. The shop owner
-- explicitly reserves stock (moving the order to PENDING_PAYMENT) once they
-- hear from the customer directly (WhatsApp/Instagram DM) - this avoids an
-- unknown stranger locking an only-1-in-stock item and then disappearing.
ALTER TABLE orders ADD COLUMN stock_reserved BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE orders ADD COLUMN guest_access_token VARCHAR(64);

CREATE UNIQUE INDEX idx_orders_guest_access_token ON orders(guest_access_token) WHERE guest_access_token IS NOT NULL;
