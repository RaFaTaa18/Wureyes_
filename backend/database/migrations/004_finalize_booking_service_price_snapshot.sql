-- Wureyes immutable service-price snapshot migration (contract phase).
-- Run only after the backend version that writes service_price_snapshot
-- has been deployed and verified.
-- Existing rows are initialized from their currently linked service price.
-- Historical service prices may not be recoverable; this backfill uses the
-- current services.price value as the initial snapshot for existing bookings.
--
-- Preflight:
-- - Confirm migration 003 has already added the nullable column.
-- - Confirm every booking has a linked service with a non-NULL price.
-- - Confirm the compatible backend is live and new bookings write this field.
--
-- If any row remains NULL, the final ALTER will fail safely rather than
-- silently making an incomplete snapshot column mandatory.

UPDATE bookings b
INNER JOIN services s ON s.id = b.service_id
SET b.service_price_snapshot = s.price
WHERE b.service_price_snapshot IS NULL;

ALTER TABLE bookings
  MODIFY COLUMN service_price_snapshot DECIMAL(12,2) NOT NULL;
