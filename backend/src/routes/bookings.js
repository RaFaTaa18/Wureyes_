import express from "express";
import pool from "../db.js";
import { calculateInvoiceTotal, calculatePaymentSummary, validatePaymentTransaction } from "../utils/paymentRules.js";
import { createRateLimiter } from "../middlware/rateLimit.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middlware/auth.js";

const router = express.Router();

const bookingSubmissionRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: "Terlalu banyak pengiriman booking. Silakan coba lagi dalam 15 menit.",
});

function isValidCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

// ===============================
// GET BOOKINGS - ADMIN ONLY
// ===============================

router.get(
  "/",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          b.id,
          b.service_id,
          b.client_name,
          b.email,
          b.phone,
          b.event_date,
          b.location,
          b.message,
          b.status,
          b.payment_status,
          DATE_FORMAT(
            b.payment_date,
            '%Y-%m-%d'
          ) AS payment_date,
          b.payment_amount,
          b.additional_fee_amount,
          b.additional_fee_description,
          b.created_at,
          b.drive_folder_url,
          b.edited_drive_folder_url,
          b.selection_token,
          s.name AS service_name,
          s.price AS service_price
        FROM bookings b
        INNER JOIN services s
          ON b.service_id = s.id
        ORDER BY b.created_at DESC
      `);

      res.json({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error("Bookings error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve bookings",
      });
    }
  }
);


// ===============================
// POST BOOKING - PUBLIC
// ===============================

router.post("/", bookingSubmissionRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const client_name = typeof body.client_name === "string" ? body.client_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" || typeof body.phone === "number" ? String(body.phone).trim() : "";
    const service_id = Number(body.service_id);
    const event_date = typeof body.event_date === "string" ? body.event_date.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (
      !client_name ||
      !email ||
      !phone ||
      !Number.isSafeInteger(service_id) || service_id <= 0 ||
      !event_date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "client_name, email, phone, service_id, and event_date are required",
      });
    }

    if (
      client_name.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      phone.length > 30 ||
      !isValidCalendarDate(event_date) ||
      (location && location.length > 255) ||
      (message && message.length > 2000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Periksa kembali nama, email, nomor telepon, tanggal, dan panjang pesan.",
      });
    }

    const [services] = await pool.query(
      `
      SELECT id
      FROM services
      WHERE id = ?
      AND is_active = TRUE
      `,
      [service_id]
    );

    if (services.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Service not found or inactive",
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO bookings
      (
        client_name,
        email,
        phone,
        service_id,
        event_date,
        location,
        message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        client_name,
        email,
        phone,
        service_id,
        event_date,
        location || null,
        message || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Booking submitted successfully",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
});


// =====================================================
// UPDATE BOOKING - ADMIN ONLY
// =====================================================

router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        client_name,
        email,
        phone,
        service_id,
        event_date,
        location,
        message,
	edited_drive_folder_url,
      } = req.body;

      // ===============================
      // VALIDATION
      // ===============================

      if (
        !client_name ||
        !email ||
        !phone ||
        !service_id ||
        !event_date
      ) {
        return res.status(400).json({
          success: false,
          message:
            "client_name, email, phone, service_id, and event_date are required",
        });
      }

      // ===============================
      // CHECK BOOKING
      // ===============================

      const [existingBooking] = await pool.query(
        `
        SELECT id
        FROM bookings
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      );

      if (existingBooking.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      // ===============================
      // CHECK SERVICE
      // ===============================

      const [services] = await pool.query(
        `
        SELECT id
        FROM services
        WHERE id = ?
        AND is_active = TRUE
        LIMIT 1
        `,
        [service_id]
      );

      if (services.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Service not found or inactive",
        });
      }

      // ===============================
      // UPDATE BOOKING
      // ===============================

      await pool.query(
        `
        UPDATE bookings
        SET
          client_name = ?,
          email = ?,
          phone = ?,
          service_id = ?,
          event_date = ?,
          location = ?,
          message = ?,
	  edited_drive_folder_url = ?
        WHERE id = ?
        `,
        [
          client_name,
          email,
          phone,
          service_id,
          event_date,
          location || null,
          message || null,
	  edited_drive_folder_url || null,
          id,
        ]
      );

      res.json({
        success: true,
        message: "Booking updated successfully",
      });
    } catch (error) {
      console.error(
        "Update booking error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to update booking",
      });
    }
  }
);

// =====================================================
// UPDATE BOOKING STATUS - ADMIN ONLY
// =====================================================

router.patch(
  "/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking status",
        });
      }

      const [existing] = await pool.query(
        `
        SELECT id
        FROM bookings
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      await pool.query(
        `
        UPDATE bookings
        SET status = ?
        WHERE id = ?
        `,
        [status, id]
      );

      res.json({
        success: true,
        message: "Booking status updated successfully",
      });
    } catch (error) {
      console.error(
        "Update booking status error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to update booking status",
      });
    }
  }
);

// Admin: transaction-level revenue records for dashboard reporting.
router.get(
  "/payment-transactions",
  authenticateToken,
  requireAdmin,
  async (_req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          t.id,
          t.booking_id,
          t.transaction_type,
          t.amount,
          DATE_FORMAT(t.payment_date, '%Y-%m-%d') AS payment_date,
          t.notes,
          b.client_name,
          s.name AS service_name
        FROM booking_payment_transactions t
        INNER JOIN bookings b ON b.id = t.booking_id
        INNER JOIN services s ON s.id = b.service_id
        ORDER BY t.payment_date DESC, t.id DESC
      `);
      return res.json({
        success: true,
        data: rows.map((item) => ({ ...item, amount: Number(item.amount) })),
      });
    } catch (error) {
      console.error("Get all payment transactions error:", error);
      return res.status(500).json({ success: false, message: "Gagal memuat data transaksi pembayaran." });
    }
  }
);

// =====================================================
// PAYMENT TRANSACTION HISTORY - ADMIN ONLY
// =====================================================

router.get(
  "/:id/payment-transactions",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    if (!/^\d+$/.test(String(id)) || Number(id) <= 0) {
      return res.status(400).json({ success: false, message: "ID booking tidak valid." });
    }

    try {
      const [bookings] = await pool.query(
        `
        SELECT b.id, b.additional_fee_amount, b.additional_fee_description, s.price AS service_price
        FROM bookings b
        INNER JOIN services s ON s.id = b.service_id
        WHERE b.id = ?
        LIMIT 1
        `,
        [id]
      );
      if (!bookings.length) {
        return res.status(404).json({ success: false, message: "Booking tidak ditemukan." });
      }

      const [transactions] = await pool.query(
        `
        SELECT
          t.id,
          t.transaction_type,
          t.amount,
          DATE_FORMAT(t.payment_date, '%Y-%m-%d') AS payment_date,
          t.notes,
          t.created_at,
          u.name AS created_by_name
        FROM booking_payment_transactions t
        LEFT JOIN users u ON u.id = t.created_by
        WHERE t.booking_id = ?
        ORDER BY t.payment_date ASC, t.id ASC
        `,
        [id]
      );
      const totalPaid = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const invoiceTotal = calculateInvoiceTotal(bookings[0].service_price, bookings[0].additional_fee_amount);
      const paymentSummary = calculatePaymentSummary(invoiceTotal, totalPaid);

      return res.json({
        success: true,
        data: {
          booking_id: Number(id),
          invoice_total: invoiceTotal,
          additional_fee_amount: Number(bookings[0].additional_fee_amount || 0),
          additional_fee_description: bookings[0].additional_fee_description || "",
          total_paid: paymentSummary.totalPaid,
          remaining_amount: paymentSummary.remainingAmount,
          transactions: transactions.map((item) => ({
            ...item,
            amount: Number(item.amount),
          })),
        },
      });
    } catch (error) {
      console.error("Get payment transactions error:", error);
      return res.status(500).json({ success: false, message: "Gagal memuat riwayat pembayaran." });
    }
  }
);

router.post(
  "/:id/payment-transactions",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    const {
      transaction_type,
      amount: rawAmount,
      payment_date,
      notes = "",
      additional_fee_amount,
      additional_fee_description,
    } = req.body ?? {};

    if (!/^\d+$/.test(String(id)) || Number(id) <= 0) {
      return res.status(400).json({ success: false, message: "ID booking tidak valid." });
    }
    if (!["dp", "installment", "final"].includes(transaction_type)) {
      return res.status(400).json({ success: false, message: "Jenis transaksi tidak valid." });
    }

    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) {
      return res.status(400).json({ success: false, message: "Nominal pembayaran harus lebih besar dari Rp0 dan maksimal 2 angka desimal." });
    }
    if (!isValidCalendarDate(payment_date)) {
      return res.status(400).json({ success: false, message: "Tanggal pembayaran tidak valid. Gunakan format YYYY-MM-DD." });
    }
    if (typeof notes !== "string" || notes.trim().length > 500) {
      return res.status(400).json({ success: false, message: "Catatan transaksi maksimal 500 karakter." });
    }

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [bookings] = await connection.query(
        `
        SELECT b.id, b.additional_fee_amount, b.additional_fee_description,
          s.price AS service_price
        FROM bookings b
        INNER JOIN services s ON s.id = b.service_id
        WHERE b.id = ?
        LIMIT 1
        FOR UPDATE
        `,
        [id]
      );
      if (!bookings.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: "Booking tidak ditemukan." });
      }

      const booking = bookings[0];
      const additionalFee = additional_fee_amount === undefined
        ? Number(booking.additional_fee_amount || 0)
        : Number(additional_fee_amount);
      const feeDescription = additional_fee_description === undefined
        ? (booking.additional_fee_description || null)
        : String(additional_fee_description ?? "").trim() || null;

      if (!Number.isFinite(additionalFee) || additionalFee < 0 || Math.abs(additionalFee * 100 - Math.round(additionalFee * 100)) > 0.0001) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Biaya tambahan tidak valid." });
      }
      if (feeDescription && feeDescription.length > 255) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Keterangan biaya tambahan maksimal 255 karakter." });
      }

      const invoiceTotal = calculateInvoiceTotal(booking.service_price, additionalFee);
      const [sumRows] = await connection.query(
        "SELECT COALESCE(SUM(amount), 0) AS total_paid FROM booking_payment_transactions WHERE booking_id = ?",
        [id]
      );
      const totalBefore = Number(sumRows[0].total_paid || 0);
      const validationError = validatePaymentTransaction({
        transactionType: transaction_type,
        amount,
        totalPaid: totalBefore,
        invoiceTotal,
      });
      if (validationError) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: validationError });
      }
      const totalAfter = Number((totalBefore + amount).toFixed(2));
      const paymentSummary = calculatePaymentSummary(invoiceTotal, totalAfter);

      await connection.query(
        `
        INSERT INTO booking_payment_transactions
          (booking_id, transaction_type, amount, payment_date, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [id, transaction_type, amount, `${payment_date} 12:00:00`, notes.trim() || null, req.user.id || null]
      );

      const paymentStatus = paymentSummary.paymentStatus;
      const [latestPaymentRows] = await connection.query(
        "SELECT MAX(payment_date) AS latest_payment_date FROM booking_payment_transactions WHERE booking_id = ?",
        [id]
      );
      await connection.query(
        `
        UPDATE bookings
        SET payment_status = ?,
          payment_amount = ?,
          payment_date = ?,
          additional_fee_amount = ?,
          additional_fee_description = ?
        WHERE id = ?
        `,
        [paymentStatus, totalAfter, latestPaymentRows[0].latest_payment_date, additionalFee, feeDescription, id]
      );

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: "Transaksi pembayaran berhasil dicatat.",
        data: {
          booking_id: Number(id),
          payment_status: paymentStatus,
          invoice_total: invoiceTotal,
          total_paid: totalAfter,
          remaining_amount: paymentSummary.remainingAmount,
          payment_date,
          additional_fee_amount: additionalFee,
          additional_fee_description: feeDescription || "",
        },
      });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Create payment transaction error:", error);
      return res.status(500).json({ success: false, message: "Gagal menyimpan transaksi pembayaran." });
    } finally {
      if (connection) connection.release();
    }
  }
);

// Deprecated compatibility endpoint. Payment records are append-only now.
router.patch(
  "/:id/payment",
  authenticateToken,
  requireAdmin,
  (_req, res) => res.status(410).json({
    success: false,
    message: "Endpoint pembayaran lama sudah digantikan. Gunakan endpoint payment-transactions agar riwayat pembayaran tidak tertimpa.",
  })
);

export default router;
