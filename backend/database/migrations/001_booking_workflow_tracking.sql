-- Wureyes booking workflow + client tracking migration.
-- Run once against wureyes_db after backing up the database.
-- Existing booking rows and selection_token values are preserved.

ALTER TABLE bookings
  MODIFY COLUMN payment_status ENUM('unpaid', 'dp', 'paid') DEFAULT 'unpaid';

CREATE TABLE IF NOT EXISTS booking_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  current_stage VARCHAR(40) NOT NULL DEFAULT 'booking_received',
  client_note TEXT NULL,
  internal_note TEXT NULL,
  estimated_delivery_date DATE NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_booking_progress (booking_id),
  KEY idx_progress_stage (current_stage),
  CONSTRAINT fk_progress_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_progress_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS booking_progress_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  stage VARCHAR(40) NOT NULL,
  client_note TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_history_booking_created (booking_id, created_at),
  CONSTRAINT fk_history_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS booking_tracking_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_tracking_booking (booking_id),
  UNIQUE KEY unique_tracking_hash (token_hash),
  CONSTRAINT fk_tracking_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed a sensible initial stage for all existing bookings without changing booking statuses.
INSERT INTO booking_progress (booking_id, current_stage)
SELECT id,
  CASE
    WHEN status = 'completed' THEN 'final_delivery'
    WHEN status = 'confirmed' THEN 'booking_confirmed'
    ELSE 'booking_received'
  END
FROM bookings
ON DUPLICATE KEY UPDATE booking_id = VALUES(booking_id);
