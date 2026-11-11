-- Wureyes payment transaction history migration.
-- Additive migration: preserves all existing bookings and legacy payment columns.
-- Backfills each existing positive payment_amount as one legacy transaction.
-- Safe to re-run: legacy_booking_id is unique and INSERT IGNORE prevents duplicates.
-- Review and back up wureyes_db before running this migration.
--
-- IMPORTANT:
-- 1. Run 001_booking_workflow_tracking.sql first so the booking workflow schema is ready.
-- 2. Do not run this migration on production until the application changes are tested.
-- 3. Booking #3 (Natasyah Aza Sabila) is a confirmed four-person group booking:
--    Rp80,000 per person = Rp320,000 total, fully paid. The legacy
--    payment_amount column contains only the per-person rate (Rp80,000), while
--    additional_fee_amount contains the remaining group value (Rp240,000).
--    Import the confirmed full payment as Rp320,000 without changing either
--    legacy column. The note records why this one historical amount differs.

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
  CASE
    WHEN b.id = 3 THEN 320000.00
    ELSE b.payment_amount
  END,
  b.payment_date,
  CASE
    WHEN b.id = 3 THEN
      'Imported as Rp320,000: confirmed fully paid group booking for 4 people at Rp80,000 per person. Legacy payment_amount stores the per-person rate; additional_fee_amount stores the remaining group value.'
    ELSE
      'Imported from the existing bookings.payment_amount/payment_date fields.'
  END,
  NULL,
  b.id
FROM bookings b
WHERE b.payment_amount IS NOT NULL
  AND b.payment_amount > 0;
