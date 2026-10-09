import express from "express";
import pool from "../db.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middlware/auth.js";

const router = express.Router();

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

router.post("/", async (req, res) => {
  try {
    const {
      client_name,
      email,
      phone,
      service_id,
      event_date,
      location,
      message,
    } = req.body;

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

// =====================================================
 // UPDATE BOOKING PAYMENT - ADMIN ONLY
 // =====================================================

router.patch(
  "/:id/payment",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
  payment_status,
  payment_amount,
  payment_date,
  additional_fee_amount,
  additional_fee_description,
} = req.body;

      // 1. Validate payment status
      const allowedPaymentStatuses = [
        "unpaid",
        "paid",
      ];

      if (
        !allowedPaymentStatuses.includes(
          payment_status
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status",
        });
      }

      // 2. Check whether booking exists
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

      // 3. Prepare payment data
      let amount = null;
      let selectedPaymentDate = null;

      if (payment_status === "paid") {
        // Validate amount
        if (
          payment_amount === null ||
          payment_amount === undefined ||
          String(payment_amount).trim() === ""
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Jumlah pembayaran wajib diisi.",
          });
        }

        amount = Number(payment_amount);

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Jumlah pembayaran harus lebih besar dari Rp0.",
          });
        }

        // Validate date format and actual calendar date
        if (
          typeof payment_date !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(payment_date)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Tanggal pembayaran wajib diisi dengan format YYYY-MM-DD.",
          });
        }

        const [year, month, day] =
          payment_date.split("-").map(Number);

        const parsedDate = new Date(
          Date.UTC(year, month - 1, day)
        );

        const validDate =
          parsedDate.getUTCFullYear() === year &&
          parsedDate.getUTCMonth() === month - 1 &&
          parsedDate.getUTCDate() === day;

        if (!validDate) {
          return res.status(400).json({
            success: false,
            message:
              "Tanggal pembayaran tidak valid.",
          });
        }

        selectedPaymentDate = payment_date;
      }

      const additionalFee = Number(
  additional_fee_amount ?? 0
);

if (
  !Number.isFinite(additionalFee) ||
  additionalFee < 0
) {
  return res.status(400).json({
    success: false,
    message:
      "Biaya tambahan tidak boleh negatif.",
  });
}

const additionalFeeDescription =
  String(
    additional_fee_description ?? ""
  ).trim();

if (
  additionalFeeDescription.length > 255
) {
  return res.status(400).json({
    success: false,
    message:
      "Deskripsi biaya tambahan maksimal 255 karakter.",
  });
}

      // 4. Save payment data to MySQL
      await pool.query(
  `
  UPDATE bookings
  SET
    payment_status = ?,
    payment_amount = ?,
    payment_date = ?,
    additional_fee_amount = ?,
    additional_fee_description = ?
  WHERE id = ?
  `,
  [
    payment_status,
    amount,
    selectedPaymentDate,
    additionalFee,
    additionalFeeDescription || null,
    id,
  ]
);

      // 5. Return saved payment data
      // 5. Read saved payment data from MySQL
      const [updatedRows] = await pool.query(
  `
  SELECT
    id,
    payment_status,
    payment_amount,
    DATE_FORMAT(
      payment_date,
      '%Y-%m-%d'
    ) AS payment_date,
    additional_fee_amount,
    additional_fee_description
  FROM bookings
  WHERE id = ?
  LIMIT 1
  `,
  [id]
);

      const updatedPayment = updatedRows[0];

      res.json({
        success: true,
        message: "Payment updated successfully",
        data: {
  booking_id: Number(updatedPayment.id),
  payment_status:
    updatedPayment.payment_status,
  payment_amount:
    updatedPayment.payment_amount === null
      ? null
      : Number(updatedPayment.payment_amount),
  payment_date:
    updatedPayment.payment_date,
  additional_fee_amount:
    Number(updatedPayment.additional_fee_amount ?? 0),
  additional_fee_description:
    updatedPayment.additional_fee_description ?? "",
},
      });
    } catch (error) {
      console.error(
        "Update payment error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to update payment",
      });
    }
  }
);

export default router;
