-- V9: add UPI ID to shops for simpler manual-payment instructions (bank details remain optional)

ALTER TABLE shops ADD COLUMN upi_id VARCHAR(255);
