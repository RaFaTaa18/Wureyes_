-- Wureyes payment transaction history migration.
-- Additive migration: preserves all existing bookings and legacy payment columns.
-- Backfills each existing positive payment_amount as one legacy transaction.
-- Safe to re-run: legacy_booking_id is unique and INSERT IGNORE prevents duplicates.
-- Review and back up wureyes_db before running this migration.
--
-- IMPORTANT:
-- 1. Run 001_booking_workflow_tracking.sql first so the booking workflow schema is ready.
-- 2. Do not run this migration on production until the application changes are tested.

CREATE TABLE IF NOT EXISTS booking_payment_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM('dp', 'installment', 'final', 'legacy') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATETIME NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  legacy_booking_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_legacy_booking_payment (legacy_booking_id),
  KEY idx_payment_booking_date (booking_id, payment_date, id),
  KEY idx_payment_created_by (created_by),
  CONSTRAINT fk_payment_transaction_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_payment_transaction_user
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_payment_transaction_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Preserve the existing single payment record without modifying bookings.
-- A NULL payment_date is retained when the old record has no known date.
INSERT IGNORE INTO booking_payment_transactions (
  booking_id,
  transaction_type,
  amount,
  payment_date,
  notes,
  created_by,
  legacy_booking_id
)
SELECT
  b.id,
  'legacy',
  b.payment_amount,
  b.payment_date,
  'Imported from the existing bookings.payment_amount/payment_date fields.',
  NULL,
  b.id
FROM bookings b
WHERE b.payment_amount IS NOT NULL
  AND b.payment_amount > 0;
