import express from "express";
import pool from "../db.js";

const router = express.Router();

// Public testimonials shown on the website.
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        client_name,
        client_role,
        message,
        rating,
        image_url,
        created_at
      FROM testimonials
      WHERE is_published = TRUE
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Testimonials error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve testimonials",
    });
  }
});

// Client testimonial submission. New testimonials are published immediately.
router.post("/", async (req, res) => {
  try {
    const clientName =
      typeof req.body.client_name === "string"
        ? req.body.client_name.trim()
        : "";
    const clientRole =
      typeof req.body.client_role === "string"
        ? req.body.client_role.trim()
        : "";
    const message =
      typeof req.body.message === "string"
        ? req.body.message.trim()
        : "";
    const rating = Number(req.body.rating);

    if (!clientName || !message) {
      return res.status(400).json({
        success: false,
        message: "Nama dan testimonial wajib diisi.",
      });
    }

    if (clientName.length > 80 || clientRole.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Nama maksimal 80 karakter dan keterangan maksimal 100 karakter.",
      });
    }

    if (message.length < 10 || message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Testimonial harus berisi 10–1000 karakter.",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating harus antara 1 sampai 5.",
      });
    }

    const [insertResult] = await pool.query(
      `
      INSERT INTO testimonials
        (client_name, client_role, message, rating, is_published)
      VALUES (?, ?, ?, ?, TRUE)
      `,
      [clientName, clientRole || null, message, rating]
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        client_name,
        client_role,
        message,
        rating,
        image_url,
        created_at
      FROM testimonials
      WHERE id = ?
      LIMIT 1
      `,
      [insertResult.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Testimonial berhasil dikirim dan sudah tampil.",
      data: rows[0],
    });
  } catch (error) {
    console.error("Create testimonial error:", error);

    return res.status(500).json({
      success: false,
      message: "Testimonial gagal disimpan. Silakan coba lagi.",
    });
  }
});

export default router;
