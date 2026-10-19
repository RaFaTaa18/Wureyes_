import express from "express";
import {
  authenticateToken,
  requireAdmin,
} from "../middlware/auth.js";

const router = express.Router();

const FOLDER_ID = "1Z7rapUP1N1paK4d-j1vYz2RtHKilCbX8";
const GOOGLE_API_TIMEOUT_MS = 10000;

function isValidDriveFileId(fileId) {
  return (
    typeof fileId === "string" &&
    /^[A-Za-z0-9_-]{1,200}$/.test(fileId)
  );
}

function isAllowedThumbnailUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    return (
      url.protocol === "https:" &&
      (host === "drive.google.com" ||
        host.endsWith(".googleusercontent.com"))
    );
  } catch {
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| TEST GOOGLE DRIVE - ADMIN ONLY
|--------------------------------------------------------------------------
*/

router.get(
  "/test",
  authenticateToken,
  requireAdmin,
  async (_req, res) => {
    try {
      const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

      if (!apiKey) {
        return res.status(503).json({
          success: false,
          message: "Google Drive integration is not configured",
        });
      }

      const query = encodeURIComponent(
        `'${FOLDER_ID}' in parents and trashed = false`
      );
      const url =
        "https://www.googleapis.com/drive/v3/files" +
        `?q=${query}` +
        `&key=${apiKey}` +
        "&fields=files(id,name,mimeType,thumbnailLink,webViewLink,size)" +
        "&pageSize=100";

      const response = await fetch(url, {
        signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
      });

      if (!response.ok) {
        console.error("Google Drive test request failed:", response.status);
        return res.status(502).json({
          success: false,
          message: "Failed to retrieve Google Drive files",
        });
      }

      const data = await response.json();
      const files = (data.files || []).map((file) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        thumbnailLink: file.thumbnailLink || null,
        webViewLink: file.webViewLink || null,
        size: file.size || null,
      }));

      return res.json({
        success: true,
        folderId: FOLDER_ID,
        total: files.length,
        files,
      });
    } catch (error) {
      console.error(
        "Google Drive test request failed:",
        error instanceof Error ? error.message : "Unknown error"
      );

      return res.status(502).json({
        success: false,
        message: "Google Drive request failed",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GOOGLE DRIVE THUMBNAIL PROXY
|--------------------------------------------------------------------------
| This endpoint remains public because client photo-selection pages use it.
| Keep responses limited to validated image thumbnails and avoid logging API
| keys, complete URLs, or file metadata.
|--------------------------------------------------------------------------
*/

router.get("/thumbnail/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

    if (!isValidDriveFileId(fileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google Drive file ID",
      });
    }

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Google Drive integration is not configured",
      });
    }

    const metadataUrl =
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
      `?fields=id,thumbnailLink,mimeType&key=${encodeURIComponent(apiKey)}`;

    const metadataResponse = await fetch(metadataUrl, {
      signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
    });

    if (!metadataResponse.ok) {
      console.error(
        "Google Drive metadata request failed:",
        metadataResponse.status
      );

      return res.status(
        metadataResponse.status === 404 ? 404 : 502
      ).json({
        success: false,
        message: "Unable to retrieve the requested thumbnail",
      });
    }

    const metadata = await metadataResponse.json();

    if (metadata.id !== fileId || !metadata.mimeType?.startsWith("image/")) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    if (
      typeof metadata.thumbnailLink !== "string" ||
      !isAllowedThumbnailUrl(metadata.thumbnailLink)
    ) {
      return res.status(404).json({
        success: false,
        message: "Thumbnail is unavailable",
      });
    }

    const thumbnailUrl = metadata.thumbnailLink.replace(
      /=s[0-9]+$/,
      "=s1600"
    );

    const imageResponse = await fetch(thumbnailUrl, {
      signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
    });

    if (!imageResponse.ok) {
      console.error(
        "Google Drive thumbnail request failed:",
        imageResponse.status
      );

      return res.status(502).json({
        success: false,
        message: "Unable to retrieve the requested thumbnail",
      });
    }

    const contentType = imageResponse.headers.get("content-type") || "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      return res.status(502).json({
        success: false,
        message: "Google Drive returned an invalid thumbnail",
      });
    }

    const contentLength = Number(
      imageResponse.headers.get("content-length") || 0
    );

    if (contentLength > 10 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "Thumbnail exceeds the allowed size",
      });
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    if (imageBuffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "Thumbnail exceeds the allowed size",
      });
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", imageBuffer.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600");

    return res.send(imageBuffer);
  } catch (error) {
    console.error(
      "Thumbnail proxy request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return res.status(502).json({
      success: false,
      message: "Unable to retrieve the requested thumbnail",
    });
  }
});

export default router;
