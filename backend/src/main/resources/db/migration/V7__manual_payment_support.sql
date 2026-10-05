-- V7: manual (pay-owner-directly) payment method support
-- Lets a shop owner accept payments outside Razorpay (bank transfer/UPI/cash)
-- while still keeping a linkage between the order and what was paid:
-- payment_method records how the customer chose to pay, and payment_reference
-- stores whatever the customer self-reports (UTR/UPI ref/note) after paying,
-- which the owner then verifies before marking the order PAID.

ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'RAZORPAY';
ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(255);

-- Public contact number shown to customers paying manually (in addition to
-- the existing bank payout details), so they know who/where to confirm with.
ALTER TABLE shops ADD COLUMN contact_phone VARCHAR(32);
