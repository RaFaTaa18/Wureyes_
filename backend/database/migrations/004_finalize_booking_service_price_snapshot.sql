-- Wureyes immutable service-price snapshot migration (contract phase).
-- Run only after the backend version that writes service_price_snapshot
-- has been deployed and verified.
-- Existing rows are initialized from their currently linked service price.
-- Historical service prices may not be recoverable; this backfill uses the
-- current services.price value as the initial snapshot for existing bookings.
--
-- Preflight:
-- - Confirm no booking has a missing service or NULL service price.
-- - Confirm migration 003 has already added the nullable column.
-- - Confirm the compatible backend is live and new bookings write this field.
--
-- This migration intentionally fails if a booking cannot be backfilled;
-- do not bypass that failure by assigning an arbitrary price.

UPDATE bookings b
INNER JOIN services s ON s.id = b.service_id
SET b.service_price_snapshot = s.price
WHERE b.service_price_snapshot IS NULL;

-- Guard against silently enforcing NOT NULL while any row remains unfilled.
SELECT COUNT(*) INTO @wureyes_missing_price_snapshots
FROM bookings
WHERE service_price_snapshot IS NULL;

SET @wureyes_snapshot_sql = IF(
  @wureyes_missing_price_snapshots = 0,
  'ALTER TABLE bookings MODIFY COLUMN service_price_snapshot DECIMAL(12,2) NOT NULL',
  'SELECT ''ERROR: service_price_snapshot still contains NULL values; migration 004 not finalized'' AS migration_error'
);

PREPARE wureyes_snapshot_stmt FROM @wureyes_snapshot_sql;
EXECUTE wureyes_snapshot_stmt;
DEALLOCATE PREPARE wureyes_snapshot_stmt;
