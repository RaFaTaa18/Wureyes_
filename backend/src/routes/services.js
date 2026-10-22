import express from "express";
import fs from "fs";
import path from "path";
import serviceUpload from "../middlware/serviceUpload.js";
import validateImageSignature from "../middlware/validateImageSignature.js";
import pool from "../db.js";

import {
  authenticateToken,
  requireAdmin,
} from "../middlware/auth.js";

const router = express.Router();
const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "services"
);

function deleteServiceImage(imageUrl) {
  if (
    !imageUrl ||
    !imageUrl.startsWith("/uploads/services/")
  ) {
    return;
  }

  const filename = path.basename(imageUrl);
  const filePath = path.join(uploadDirectory, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function handleServiceUpload(req, res, next) {
  serviceUpload.single("image")(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Ukuran gambar maksimal 5 MB."
          : error.message;

      return res.status(400).json({
        success: false,
        message,
      });
    }

    next();
  });
}

function parseBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return value === true || value === "true" || value === 1 || value === "1";
}


// =====================================================
// GET SERVICES - PUBLIC
// =====================================================

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        name,
        slug,
        description,
        detail_content,
        price,
        image_url,
        is_active,
        created_at,
        updated_at
      FROM services
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: rows,
    });

  } catch (error) {

    console.error(
      "Get services error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve services",
    });

  }
});


// =====================================================
// POST SERVICE - ADMIN ONLY
// =====================================================

router.post(
  "/",
  authenticateToken,
  requireAdmin,
  handleServiceUpload,
  validateImageSignature,
  async (req, res) => {

    try {
  const {
    name,
    slug,
    description,
    price,
    image_url,
    is_active,
  } = req.body;

  if (!name || !slug) {
    if (req.file) {
      deleteServiceImage(
        `/uploads/services/${req.file.filename}`
      );
    }

    return res.status(400).json({
      success: false,
      message: "name and slug are required",
    });
  }


      
      // Check duplicate slug
      const [existing] = await pool.query(
        `
        SELECT id
        FROM services
        WHERE slug = ?
        LIMIT 1
        `,
        [slug]
      );

      if (existing.length > 0) {
        // Hapus gambar baru jika slug sudah digunakan
        if (req.file) {
          deleteServiceImage(
            `/uploads/services/${req.file.filename}`
          );
        }

        return res.status(409).json({
          success: false,
          message: "Service slug already exists",
        });
      }



      const [result] =
        await pool.query(
          `
          INSERT INTO services
          (
            name,
            slug,
            description,
            detail_content,
            price,
            image_url,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            name,
            slug,
            description || null,
            detail_content || null,
            price !== undefined &&
            price !== null &&
            price !== ""
              ? Number(price)
              : null,
            req.file
  ? `/uploads/services/${req.file.filename}`
  : image_url || null,
            parseBoolean(is_active),
          ]
        );


      res.status(201).json({
        success: true,
        message:
          "Service created successfully",
        data: {
          id: result.insertId,
        },
      });

    } catch (error) {

      console.error(
        "Create service error:",
        error
      );

      if (req.file) {
  deleteServiceImage(
    `/uploads/services/${req.file.filename}`
  );
}

      res.status(500).json({
        success: false,
        message:
          "Failed to create service",
      });

    }

  }
);


// =====================================================
// PUT SERVICE - ADMIN ONLY
// =====================================================

router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  handleServiceUpload,
  validateImageSignature,
  async (req, res) => {

    try {

      const { id } = req.params;

      const {
        name,
        slug,
        description,
        detail_content,
        price,
        image_url,
        is_active,
      } = req.body;


      
if (!name || !slug) {
  if (req.file) {
    deleteServiceImage(
      `/uploads/services/${req.file.filename}`
    );
  }

  return res.status(400).json({
    success: false,
    message: "name and slug are required",
  });
}



      
      // Check service exists
      const [existingService] = await pool.query(
        `
        SELECT id, image_url
        FROM services
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      );

      if (existingService.length === 0) {
        if (req.file) {
          deleteServiceImage(
            `/uploads/services/${req.file.filename}`
          );
        }

        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      const oldImageUrl = existingService[0].image_url;



      // Check duplicate slug
      // excluding current service

      const [duplicateSlug] =
        await pool.query(
          `
          SELECT id
          FROM services
          WHERE slug = ?
          AND id != ?
          LIMIT 1
          `,
          [slug, id]
        );


      if (duplicateSlug.length > 0) {
  if (req.file) {
    deleteServiceImage(
      `/uploads/services/${req.file.filename}`
    );
  }

        return res.status(409).json({
          success: false,
          message:
            "Service slug already exists",
        });

      }


      await pool.query(
        `
        UPDATE services
        SET
          name = ?,
          slug = ?,
          description = ?,
          detail_content = ?,
          price = ?,
          image_url = ?,
          is_active = ?
        WHERE id = ?
        `,
        [
          name,
          slug,
          description || null,
          detail_content || null,
          price !== undefined &&
          price !== null &&
          price !== ""
            ? Number(price)
            : null,
          req.file
  ? `/uploads/services/${req.file.filename}`
  : image_url || oldImageUrl || null, 
          parseBoolean(is_active),
          id,
        ]
      );


      // Hapus gambar lama setelah gambar baru berhasil disimpan
      if (req.file) {
        deleteServiceImage(oldImageUrl);
      }

      return res.json({
        success: true,
        message: "Service updated successfully",
      });

    } catch (error) {

      console.error(
        "Update service error:",
        error
      );

      if (req.file) {
  deleteServiceImage(
    `/uploads/services/${req.file.filename}`
  );
}

      res.status(500).json({
        success: false,
        message:
          "Failed to update service",
      });

    }

  }
);


// =====================================================
// DELETE SERVICE - ADMIN ONLY
// =====================================================

router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {

    try {

      const { id } = req.params;


      // Check if service exists

      const [existingService] =
        await pool.query(
          `
          SELECT id
          FROM services
          WHERE id = ?
          LIMIT 1
          `,
          [id]
        );


      if (existingService.length === 0) {

        return res.status(404).json({
          success: false,
          message:
            "Service not found",
        });

      }


      // Check whether service is used
      // by bookings

      const [bookings] =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM bookings
          WHERE service_id = ?
          `,
          [id]
        );


      if (Number(bookings[0].total) > 0) {

        return res.status(409).json({
          success: false,
          message:
            "This service cannot be deleted because it is already used by bookings. Deactivate it instead.",
        });

      }


      await pool.query(
        `
        DELETE FROM services
        WHERE id = ?
        `,
        [id]
      );


      res.json({
        success: true,
        message:
          "Service deleted successfully",
      });

    } catch (error) {

      console.error(
        "Delete service error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to delete service",
      });

    }

  }
);


export default router;