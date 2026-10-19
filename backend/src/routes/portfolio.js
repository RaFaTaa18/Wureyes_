import express from "express";
import fs from "fs";
import path from "path";

import pool from "../db.js";
import upload from "../middlware/upload.js";
import validateImageSignature from "../middlware/validateImageSignature.js";

import {
  authenticateToken,
  requireAdmin,
} from "../middlware/auth.js";

const router = express.Router();

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "portfolio"
);

/**
 * GET /api/portfolio
 * Public
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        p.title,
        p.slug,
        p.description,
        p.image_url,
        p.project_date,
        p.featured,
        p.created_at,
        p.updated_at
      FROM portfolio p
      INNER JOIN categories c
        ON p.category_id = c.id
      ORDER BY
        p.featured DESC,
        p.created_at DESC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(
      "Get portfolio error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve portfolio",
    });
  }
});

/**
 * POST /api/portfolio
 * Admin only
 */
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  upload.single("image"),
  validateImageSignature,
  async (req, res) => {
    try {
      const {
        category_id,
        title,
        slug,
        description,
        project_date,
        featured,
      } = req.body;

      if (
        !category_id ||
        !title ||
        !slug
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Category, title, and slug are required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Portfolio image is required",
        });
      }

      const image_url =
        `/uploads/portfolio/${req.file.filename}`;

      const [result] = await pool.query(
        `
        INSERT INTO portfolio
        (
          category_id,
          title,
          slug,
          description,
          image_url,
          project_date,
          featured
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          category_id,
          title,
          slug,
          description || null,
          image_url,
          project_date || null,
          featured === "true" ||
            featured === true,
        ]
      );

      res.status(201).json({
        success: true,
        message:
          "Portfolio created successfully",
        data: {
          id: result.insertId,
          image_url,
        },
      });
    } catch (error) {
      console.error(
        "Create portfolio error:",
        error
      );

      if (req.file) {
        const uploadedFile = path.join(
          uploadDirectory,
          req.file.filename
        );

        if (fs.existsSync(uploadedFile)) {
          fs.unlinkSync(uploadedFile);
        }
      }

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message:
            "Slug already exists. Please use another slug.",
        });
      }

      res.status(500).json({
        success: false,
        message:
          "Failed to create portfolio",
      });
    }
  }
);

/**
 * PUT /api/portfolio/:id
 * Admin only
 */
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  upload.single("image"),
  validateImageSignature,
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        category_id,
        title,
        slug,
        description,
        project_date,
        featured,
      } = req.body;

      const [existingRows] = await pool.query(
        `
        SELECT image_url
        FROM portfolio
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      );

      if (existingRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Portfolio not found",
        });
      }

      const oldImageUrl =
        existingRows[0].image_url;

      let imageUrl = oldImageUrl;

      if (req.file) {
        imageUrl =
          `/uploads/portfolio/${req.file.filename}`;
      }

      const [result] = await pool.query(
        `
        UPDATE portfolio
        SET
          category_id = ?,
          title = ?,
          slug = ?,
          description = ?,
          image_url = ?,
          project_date = ?,
          featured = ?
        WHERE id = ?
        `,
        [
          category_id,
          title,
          slug,
          description || null,
          imageUrl,
          project_date || null,
          featured === "true" ||
            featured === true,
          id,
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Portfolio not found",
        });
      }

      // Hapus gambar lama jika diganti
      if (
        req.file &&
        oldImageUrl &&
        oldImageUrl.startsWith(
          "/uploads/portfolio/"
        )
      ) {
        const oldFilePath = path.join(
          process.cwd(),
          oldImageUrl.replace(
            /^\/uploads\/portfolio\//,
            "uploads/portfolio/"
          )
        );

        if (
          fs.existsSync(oldFilePath)
        ) {
          fs.unlinkSync(oldFilePath);
        }
      }

      res.json({
        success: true,
        message:
          "Portfolio updated successfully",
        data: {
          image_url: imageUrl,
        },
      });
    } catch (error) {
      console.error(
        "Update portfolio error:",
        error
      );

      if (req.file) {
        const uploadedFile = path.join(
          uploadDirectory,
          req.file.filename
        );

        if (fs.existsSync(uploadedFile)) {
          fs.unlinkSync(uploadedFile);
        }
      }

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message:
            "Slug already exists. Please use another slug.",
        });
      }

      res.status(500).json({
        success: false,
        message:
          "Failed to update portfolio",
      });
    }
  }
);

/**
 * DELETE /api/portfolio/:id
 * Admin only
 */
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await pool.query(
        `
        SELECT image_url
        FROM portfolio
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Portfolio not found",
        });
      }

      const imageUrl =
        rows[0].image_url;

      await pool.query(
        `
        DELETE FROM portfolio
        WHERE id = ?
        `,
        [id]
      );

      // Hapus file gambar
      if (
        imageUrl &&
        imageUrl.startsWith(
          "/uploads/portfolio/"
        )
      ) {
        const filePath = path.join(
          process.cwd(),
          imageUrl.replace(
            /^\//,
            ""
          )
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.json({
        success: true,
        message:
          "Portfolio deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete portfolio error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to delete portfolio",
      });
    }
  }
);

export default router;