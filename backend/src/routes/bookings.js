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
          b.payment_date,
          b.payment_amount,
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
      } = req.body;

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

      const [existing] = await pool.query(
        `
        SELECT id, service_id
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

      let amount = null;

      if (
        payment_status === "paid"
      ) {
        amount = Number(payment_amount);

        if (
          !Number.isFinite(amount) ||
          amount < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid payment amount",
          });
        }
      }

      await pool.query(
        `
        UPDATE bookings
        SET
          payment_status = ?,
          payment_amount = ?,
          payment_date = ?
        WHERE id = ?
        `,
        [
          payment_status,
          amount,
          payment_status === "paid"
            ? new Date()
            : null,
          id,
        ]
      );

      res.json({
        success: true,
        message:
          "Payment updated successfully",
        data: {
          booking_id: Number(id),
          payment_status,
          payment_amount: amount,
          payment_date:
            payment_status === "paid"
              ? new Date()
              : null,
        },
      });
    } catch (error) {
      console.error(
        "Update payment error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to update payment",
      });
    }
  }
);

export default router;
