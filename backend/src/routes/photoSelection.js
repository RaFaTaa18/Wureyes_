import express from "express";
import crypto from "crypto";

import pool from "../db.js";
import { createRateLimiter } from "../middlware/rateLimit.js";

import {
  authenticateToken,
  requireAdmin,
} from "../middlware/auth.js";

const router = express.Router();

const photoGalleryRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: "Terlalu banyak permintaan galeri. Silakan coba lagi sebentar.",
});

// =====================================================
// HELPER - EXTRACT GOOGLE DRIVE FOLDER ID
// =====================================================

function extractFolderId(url) {
  if (!url) {
    return null;
  }

  // Format:
  // https://drive.google.com/drive/folders/FOLDER_ID
  const folderMatch = url.match(
    /\/folders\/([a-zA-Z0-9_-]+)/
  );

  if (folderMatch) {
    return folderMatch[1];
  }

  // Fallback:
  // https://drive.google.com/...?id=FOLDER_ID
  try {
    const parsed = new URL(url);

    return parsed.searchParams.get("id");
  } catch {
    return null;
  }
}

// =====================================================
// HELPER - GET GOOGLE DRIVE FILES
// =====================================================

async function getDriveFiles(folderId) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_DRIVE_API_KEY is not configured"
    );
  }

  const query = encodeURIComponent(
    `'${folderId}' in parents and trashed = false`
  );

  const fields = encodeURIComponent(
    "files(id,name,mimeType,thumbnailLink,webViewLink,size,createdTime)"
  );

  const url =
    `https://www.googleapis.com/drive/v3/files` +
    `?q=${query}` +
    `&key=${apiKey}` +
    `&fields=${fields}` +
    `&pageSize=1000` +
    `&orderBy=name`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error?.message ||
        "Failed to retrieve Google Drive files"
    );
  }

  return result.files || [];
}

// =====================================================
// ADMIN - GET BOOKINGS FOR PHOTO SELECTION
// =====================================================

router.get(
  "/admin/bookings",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          b.id,
          b.client_name,
          b.email,
          b.event_date,
          b.status,
          b.drive_folder_url,
          b.selection_token,
          s.name AS service_name,

          (
            SELECT COUNT(*)
            FROM photo_selections ps
            WHERE ps.booking_id = b.id
          ) AS selected_photos

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
      console.error(
        "Photo selection bookings error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to retrieve photo selection bookings",
      });
    }
  }
);

// =====================================================
// ADMIN - SAVE GOOGLE DRIVE FOLDER
// =====================================================

router.patch(
  "/admin/bookings/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        drive_folder_url,
      } = req.body;

      if (!drive_folder_url) {
        return res.status(400).json({
          success: false,
          message:
            "Google Drive folder URL is required",
        });
      }

      const folderId =
        extractFolderId(
          drive_folder_url.trim()
        );

      if (!folderId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Google Drive folder URL",
        });
      }

      const [existing] = await pool.query(
        `
        SELECT
          id,
          client_name,
          selection_token
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

      let token =
        existing[0].selection_token;

      if (!token) {
        token =
          crypto.randomBytes(32).toString("hex");
      }

      await pool.query(
        `
        UPDATE bookings
        SET
          drive_folder_url = ?,
          selection_token = ?
        WHERE id = ?
        `,
        [
          drive_folder_url.trim(),
          token,
          id,
        ]
      );

      res.json({
        success: true,
        message:
          "Google Drive folder saved successfully",

        data: {
          booking_id: Number(id),
          client_name:
            existing[0].client_name,
          folder_id: folderId,
          selection_token: token,
          selection_url:
            `/select/${token}`,
        },
      });
    } catch (error) {
      console.error(
        "Save Drive folder error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to save Google Drive folder",
      });
    }
  }
);

// =====================================================
// ADMIN - SAVE EDITED GOOGLE DRIVE FOLDER
// =====================================================

router.patch(
  "/admin/bookings/:id/edited-drive",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        edited_drive_folder_url,
      } = req.body;

      if (!edited_drive_folder_url) {
        return res.status(400).json({
          success: false,
          message:
            "Edited Google Drive folder URL is required",
        });
      }

      const driveUrl =
        edited_drive_folder_url.trim();

      if (
        !driveUrl.startsWith(
          "https://drive.google.com/"
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Google Drive folder URL",
        });
      }

      const [existing] = await pool.query(
        `
        SELECT
          id,
          client_name
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
        SET edited_drive_folder_url = ?
        WHERE id = ?
        `,
        [driveUrl, id]
      );

      res.json({
        success: true,
        message:
          "Edited Google Drive folder saved successfully",
        data: {
          booking_id: Number(id),
          client_name:
            existing[0].client_name,
          edited_drive_folder_url:
            driveUrl,
        },
      });
    } catch (error) {
      console.error(
        "Save edited Drive folder error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to save edited Google Drive folder",
      });
    }
  }
);

// =====================================================
// ADMIN - GENERATE SELECTION TOKEN
// =====================================================

router.post(
  "/admin/bookings/:id/generate-token",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await pool.query(
        `
        SELECT
          id,
          client_name,
          drive_folder_url,
          selection_token
        FROM bookings
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      const booking = rows[0];

      if (!booking.drive_folder_url) {
        return res.status(400).json({
          success: false,
          message:
            "Google Drive folder belum terhubung",
        });
      }

      let token =
        booking.selection_token;

      if (!token) {
        token =
          crypto.randomBytes(32).toString("hex");

        await pool.query(
          `
          UPDATE bookings
          SET selection_token = ?
          WHERE id = ?
          `,
          [token, id]
        );
      }

      res.json({
        success: true,
        message:
          "Selection token generated successfully",

        data: {
          booking_id: booking.id,
          client_name:
            booking.client_name,
          selection_token: token,
          selection_url:
            `/select/${token}`,
        },
      });
    } catch (error) {
      console.error(
        "Generate selection token error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to generate selection token",
      });
    }
  }
);

// =====================================================
// CLIENT - GET PHOTO GALLERY
// =====================================================

router.get(
  "/:token",
  photoGalleryRateLimit,
  async (req, res) => {
    try {
      const { token } = req.params;

      if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
        return res.status(404).json({
          success: false,
          message: "Photo selection link not found",
        });
      }

      const [rows] = await pool.query(
        `
        SELECT
          b.id,
          b.client_name,
          b.email,
          b.phone,
          b.event_date,
          b.location,
          b.message,
          b.status,
          b.drive_folder_url,
          b.selection_token,

          s.name AS service_name

        FROM bookings b

        INNER JOIN services s
          ON b.service_id = s.id

        WHERE b.selection_token = ?

        LIMIT 1
        `,
        [token]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Photo selection link not found",
        });
      }

      const booking = rows[0];

      if (!booking.drive_folder_url) {
        return res.status(400).json({
          success: false,
          message:
            "Photo gallery has not been prepared yet",
        });
      }

      const folderId =
        extractFolderId(
          booking.drive_folder_url
        );

      if (!folderId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Google Drive folder",
        });
      }

      const files =
        await getDriveFiles(folderId);

      const [selected] =
        await pool.query(
          `
          SELECT
            id,
            file_id,
            file_name,
            file_url,
            thumbnail_url,
            note,
            created_at,
            updated_at

          FROM photo_selections

          WHERE booking_id = ?

          ORDER BY id ASC
          `,
          [booking.id]
        );

      res.json({
        success: true,

        data: {
          booking_id:
            booking.id,

          client_name:
            booking.client_name,

          email:
            booking.email,

          phone:
            booking.phone,

          event_date:
            booking.event_date,

          location:
            booking.location,

          service_name:
            booking.service_name,

          status:
            booking.status,

          drive_folder_url:
            booking.drive_folder_url,

          files: files
            .filter((file) =>
              file.mimeType?.startsWith(
                "image/"
              )
            )
            .map((file) => ({
              id: file.id,

              name: file.name,

              mimeType:
                file.mimeType,

              size:
                file.size || null,

              createdTime:
                file.createdTime || null,

              thumbnail:
                file.thumbnailLink ||
                `https://drive.google.com/thumbnail?id=${file.id}&sz=w1200`,

              driveUrl:
                file.webViewLink ||
                `https://drive.google.com/file/d/${file.id}/view`,
            })),

          selected,
        },
      });
    } catch (error) {
      console.error(
        "Load photo gallery error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to load photo gallery",
      });
    }
  }
);

// =====================================================
// CLIENT - SUBMIT PHOTO SELECTION
// =====================================================

router.post(
  "/:token",
  photoGalleryRateLimit,
  async (req, res) => {
    let connection;
    let transactionStarted = false;

    try {
      const { token } = req.params;
      const { selected_photos, note } = req.body;

      if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/i.test(token)
      ) {
        return res.status(404).json({
          success: false,
          message: "Photo selection link not found",
        });
      }

      if (!Array.isArray(selected_photos)) {
        return res.status(400).json({
          success: false,
          message: "selected_photos must be an array",
        });
      }

      const MAX_SELECTED_PHOTOS = 100;
      if (selected_photos.length > MAX_SELECTED_PHOTOS) {
        return res.status(400).json({
          success: false,
          message: `A maximum of ${MAX_SELECTED_PHOTOS} photos can be selected`,
        });
      }

      if (
        note !== undefined &&
        note !== null &&
        (typeof note !== "string" || note.length > 2000)
      ) {
        return res.status(400).json({
          success: false,
          message: "Note must be a string of at most 2000 characters",
        });
      }

      const normalizedNote = typeof note === "string"
        ? note.trim() || null
        : null;

      const [rows] = await pool.query(
        `
        SELECT id, drive_folder_url
        FROM bookings
        WHERE selection_token = ?
        LIMIT 1
        `,
        [token]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Photo selection link not found",
        });
      }

      const booking = rows[0];
      const bookingId = booking.id;
      const folderId = extractFolderId(booking.drive_folder_url);

      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: "Photo gallery is not configured correctly",
        });
      }

      // Validate every submitted photo against this booking's actual Drive folder.
      const driveFiles = await getDriveFiles(folderId);
      const allowedPhotos = new Map(
        driveFiles
          .filter((file) => file.mimeType?.startsWith("image/"))
          .map((file) => [file.id, file])
      );

      const seenIds = new Set();
      const validatedPhotos = [];

      for (const photo of selected_photos) {
        if (
          !photo ||
          typeof photo.id !== "string" ||
          !/^[A-Za-z0-9_-]{1,200}$/.test(photo.id) ||
          typeof photo.name !== "string" ||
          photo.name.trim().length === 0 ||
          photo.name.length > 255
        ) {
          return res.status(400).json({
            success: false,
            message: "One or more selected photos are invalid",
          });
        }

        if (seenIds.has(photo.id)) {
          return res.status(400).json({
            success: false,
            message: "Duplicate photo selections are not allowed",
          });
        }

        const driveFile = allowedPhotos.get(photo.id);
        if (!driveFile) {
          return res.status(400).json({
            success: false,
            message: "A selected photo does not belong to this booking gallery",
          });
        }

        seenIds.add(photo.id);
        validatedPhotos.push({
          id: driveFile.id,
          name: driveFile.name,
          driveUrl: driveFile.webViewLink ||
            `https://drive.google.com/file/d/${driveFile.id}/view`,
          thumbnail: driveFile.thumbnailLink ||
            `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w1200`,
        });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();
      transactionStarted = true;

      await connection.query(
        "DELETE FROM photo_selections WHERE booking_id = ?",
        [bookingId]
      );

      for (const photo of validatedPhotos) {
        await connection.query(
          `
          INSERT INTO photo_selections
            (booking_id, file_id, file_name, file_url, thumbnail_url, note)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            bookingId,
            photo.id,
            photo.name,
            photo.driveUrl,
            photo.thumbnail,
            normalizedNote,
          ]
        );
      }

      await connection.commit();
      transactionStarted = false;

      return res.json({
        success: true,
        message: "Photo selection submitted successfully",
        data: {
          booking_id: bookingId,
          selected_count: validatedPhotos.length,
          note: normalizedNote,
        },
      });
    } catch (error) {
      if (connection && transactionStarted) {
        await connection.rollback();
      }

      console.error(
        "Submit photo selection failed:",
        error instanceof Error ? error.message : "Unknown error"
      );

      return res.status(500).json({
        success: false,
        message: "Failed to submit photo selection",
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// =====================================================
// ADMIN - GET SUBMITTED SELECTION
// =====================================================

router.get(
  "/admin/bookings/:id/selections",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const [bookingRows] =
        await pool.query(
          `
          SELECT
            b.id,
            b.client_name,
            b.email,
            b.event_date,
            s.name AS service_name

          FROM bookings b

          INNER JOIN services s
            ON b.service_id = s.id

          WHERE b.id = ?

          LIMIT 1
          `,
          [id]
        );

      if (
        bookingRows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found",
        });
      }

      const [selections] =
        await pool.query(
          `
          SELECT
            id,
            file_id,
            file_name,
            file_url,
            thumbnail_url,
            note,
            created_at,
            updated_at

          FROM photo_selections

          WHERE booking_id = ?

          ORDER BY id ASC
          `,
          [id]
        );

      const note =
        selections.find(
          (item) => item.note
        )?.note || null;

      res.json({
        success: true,

        data: {
          booking:
            bookingRows[0],

          total_selected:
            selections.length,

          note,

          selections,
        },
      });
    } catch (error) {
      console.error(
        "Get photo selections error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to retrieve photo selections",
      });
    }
  }
);

export default router;
