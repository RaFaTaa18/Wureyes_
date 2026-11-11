import express from "express";
import crypto from "crypto";
import pool from "../db.js";
import { createRateLimiter } from "../middlware/rateLimit.js";
import { authenticateToken, requireAdmin } from "../middlware/auth.js";

const router = express.Router();
const publicTrackingLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: "Terlalu banyak permintaan. Silakan coba lagi sebentar.",
});

const STAGES = [
  "booking_received",
  "booking_confirmed",
  "preparation",
  "shooting",
  "editing",
  "photo_selection",
  "revision",
  "final_delivery",
];

const STAGE_LABELS = {
  booking_received: "Booking diterima",
  booking_confirmed: "Booking dikonfirmasi",
  preparation: "Persiapan",
  shooting: "Sesi berlangsung",
  editing: "Proses editing",
  photo_selection: "Pemilihan foto",
  revision: "Revisi",
  final_delivery: "Hasil akhir dikirim",
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeBookingId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

// Admin: current workflow and calendar-ready booking data.
router.get("/admin/bookings", authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.id, b.client_name, b.event_date, b.status, b.payment_status,
        b.payment_amount, b.service_price, b.additional_fee_amount,
        s.name AS service_name, p.current_stage, p.client_note,
        p.internal_note, p.estimated_delivery_date, p.updated_at,
        (t.id IS NOT NULL AND t.revoked_at IS NULL) AS tracking_active
      FROM bookings b
      INNER JOIN services s ON s.id = b.service_id
      LEFT JOIN booking_progress p ON p.booking_id = b.id
      LEFT JOIN booking_tracking_tokens t ON t.booking_id = b.id
      ORDER BY b.event_date ASC, b.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Workflow bookings error:", error);
    res.status(500).json({ success: false, message: "Gagal memuat workflow booking." });
  }
});

// Admin: update progress and append a client-visible history entry.
router.patch("/admin/bookings/:id/progress", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { stage, client_note = "", internal_note = "", estimated_delivery_date = null } = req.body ?? {};
  if (!safeBookingId(id)) return res.status(400).json({ success: false, message: "ID booking tidak valid." });
  if (!STAGES.includes(stage)) return res.status(400).json({ success: false, message: "Tahapan workflow tidak valid." });
  if (typeof client_note !== "string" || client_note.length > 2000 || typeof internal_note !== "string" || internal_note.length > 2000) {
    return res.status(400).json({ success: false, message: "Catatan maksimal 2.000 karakter." });
  }
  if (estimated_delivery_date !== null && (typeof estimated_delivery_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(estimated_delivery_date))) {
    return res.status(400).json({ success: false, message: "Tanggal estimasi tidak valid." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [bookings] = await connection.query("SELECT id FROM bookings WHERE id = ? LIMIT 1 FOR UPDATE", [id]);
    if (!bookings.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Booking tidak ditemukan." });
    }
    await connection.query(`
      INSERT INTO booking_progress (booking_id, current_stage, client_note, internal_note, estimated_delivery_date, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE current_stage = VALUES(current_stage),
        client_note = VALUES(client_note), internal_note = VALUES(internal_note),
        estimated_delivery_date = VALUES(estimated_delivery_date), updated_by = VALUES(updated_by)
    `, [id, stage, client_note.trim() || null, internal_note.trim() || null, estimated_delivery_date || null, req.user.id]);
    await connection.query(`
      INSERT INTO booking_progress_history (booking_id, stage, client_note, created_by)
      VALUES (?, ?, ?, ?)
    `, [id, stage, client_note.trim() || null, req.user.id]);
    await connection.commit();
    res.json({ success: true, message: "Progres booking berhasil diperbarui." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Update booking progress error:", error);
    res.status(500).json({ success: false, message: "Gagal memperbarui progres booking." });
  } finally {
    if (connection) connection.release();
  }
});

// Admin: issue or rotate a separate tracking token. Only its hash is stored.
router.post("/admin/bookings/:id/link", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!safeBookingId(id)) return res.status(400).json({ success: false, message: "ID booking tidak valid." });
  try {
    const [bookings] = await pool.query("SELECT id FROM bookings WHERE id = ? LIMIT 1", [id]);
    if (!bookings.length) return res.status(404).json({ success: false, message: "Booking tidak ditemukan." });
    const rawToken = crypto.randomBytes(32).toString("hex");
    await pool.query(`
      INSERT INTO booking_tracking_tokens (booking_id, token_hash, revoked_at)
      VALUES (?, ?, NULL)
      ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), revoked_at = NULL, updated_at = CURRENT_TIMESTAMP
    `, [id, sha256(rawToken)]);
    res.json({ success: true, data: { url: `/track/${rawToken}` } });
  } catch (error) {
    console.error("Generate tracking link error:", error);
    res.status(500).json({ success: false, message: "Gagal membuat link tracking." });
  }
});

// Admin: revoke an existing client tracking link.
router.delete("/admin/bookings/:id/link", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!safeBookingId(id)) return res.status(400).json({ success: false, message: "ID booking tidak valid." });
  try {
    await pool.query("UPDATE booking_tracking_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE booking_id = ?", [id]);
    res.json({ success: true, message: "Link tracking berhasil dinonaktifkan." });
  } catch (error) {
    console.error("Revoke tracking link error:", error);
    res.status(500).json({ success: false, message: "Gagal menonaktifkan link tracking." });
  }
});

// Public: deliberately returns only client-facing booking information.
router.get("/:token", publicTrackingLimit, async (req, res) => {
  const { token } = req.params;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(404).json({ success: false, message: "Link tracking tidak ditemukan atau sudah tidak aktif." });
  }
  try {
    const [rows] = await pool.query(`
      SELECT b.id, b.client_name, b.event_date, b.location, b.status,
        b.payment_status, b.payment_amount, b.additional_fee_amount,
        s.name AS service_name, s.price AS service_price,
        p.current_stage, p.client_note, p.estimated_delivery_date,
        b.edited_drive_folder_url, b.selection_token
      FROM booking_tracking_tokens t
      INNER JOIN bookings b ON b.id = t.booking_id
      INNER JOIN services s ON s.id = b.service_id
      LEFT JOIN booking_progress p ON p.booking_id = b.id
      WHERE t.token_hash = ? AND t.revoked_at IS NULL
      LIMIT 1
    `, [sha256(token)]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Link tracking tidak ditemukan atau sudah tidak aktif." });
    const booking = rows[0];
    const [history] = await pool.query(`
      SELECT stage, client_note, created_at
      FROM booking_progress_history
      WHERE booking_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 30
    `, [booking.id]);
    const total = Number(booking.service_price || 0) + Number(booking.additional_fee_amount || 0);
    const currentStage = booking.current_stage || (booking.status === "completed" ? "final_delivery" : booking.status === "confirmed" ? "booking_confirmed" : "booking_received");
    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      data: {
        client_name: booking.client_name,
        service_name: booking.service_name,
        event_date: booking.event_date,
        location: booking.location,
        booking_status: booking.status,
        payment_status: booking.payment_status,
        payment_amount: booking.payment_amount === null ? null : Number(booking.payment_amount),
        total_amount: total,
        remaining_amount: Math.max(0, total - Number(booking.payment_amount || 0)),
        current_stage: currentStage,
        current_stage_label: STAGE_LABELS[currentStage] || "Dalam proses",
        client_note: booking.client_note,
        estimated_delivery_date: booking.estimated_delivery_date,
        final_delivery_url: booking.status === "completed" ? booking.edited_drive_folder_url : null,
        photo_selection_url: booking.selection_token ? `/select/${booking.selection_token}` : null,
        history: history.map((item) => ({ ...item, stage_label: STAGE_LABELS[item.stage] || item.stage })),
      },
    });
  } catch (error) {
    console.error("Client tracking error:", error);
    res.status(500).json({ success: false, message: "Gagal memuat informasi tracking." });
  }
});

export default router;
