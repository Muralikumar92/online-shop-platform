-- V10: email verification for customer signups.
-- New column defaults to FALSE so brand-new signups must verify, but existing
-- customers (who already signed up and may have placed orders) are backfilled
-- to TRUE immediately below so this change never locks out current users.

ALTER TABLE customers ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE customers SET email_verified = TRUE;
