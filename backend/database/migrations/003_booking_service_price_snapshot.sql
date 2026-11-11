-- Wureyes immutable service-price snapshot migration.
-- Additive only: does not delete or rewrite existing booking/payment rows.
-- Existing bookings are initialized from their currently linked service price.
-- New bookings store the service price at the time the booking is submitted.
-- Run after migrations 001 and 002, after taking a database backup.

ALTER TABLE bookings
  ADD COLUMN service_price_snapshot DECIMAL(12,2) NULL
  AFTER service_id;

UPDATE bookings b
INNER JOIN services s ON s.id = b.service_id
SET b.service_price_snapshot = s.price
WHERE b.service_price_snapshot IS NULL;

-- Keep the snapshot mandatory after all existing bookings have been backfilled.
ALTER TABLE bookings
  MODIFY COLUMN service_price_snapshot DECIMAL(12,2) NOT NULL;
