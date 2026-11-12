-- Wureyes immutable service-price snapshot migration (expand phase).
-- Additive only: adds a nullable column so the old application can continue
-- inserting bookings during the deployment transition.
-- Existing rows are backfilled and the column is made NOT NULL by migration 004.
-- Run after migrations 001 and 002, after taking a database backup.
--
-- Deployment order:
-- 1. Run migrations 001, 002, and this migration 003.
-- 2. Deploy the backend version that explicitly writes service_price_snapshot.
-- 3. Verify new booking creation and existing booking reads.
-- 4. Run migration 004 to backfill any remaining NULL values and enforce NOT NULL.

ALTER TABLE bookings
  ADD COLUMN service_price_snapshot DECIMAL(12,2) NULL
  AFTER service_id;
