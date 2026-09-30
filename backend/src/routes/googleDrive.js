import express from "express";

const router = express.Router();

const FOLDER_ID =
  "1Z7rapUP1N1paK4d-j1vYz2RtHKilCbX8";

/*
|--------------------------------------------------------------------------
| TEST GOOGLE DRIVE
|--------------------------------------------------------------------------
*/

router.get("/test", async (req, res) => {
  try {
    const apiKey =
      process.env.GOOGLE_DRIVE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message:
          "GOOGLE_DRIVE_API_KEY belum ditemukan",
      });
    }

    const query = encodeURIComponent(
      `'${FOLDER_ID}' in parents and trashed = false`
    );

    const url =
      `https://www.googleapis.com/drive/v3/files` +
      `?q=${query}` +
      `&key=${apiKey}` +
      `&fields=files(id,name,mimeType,thumbnailLink,webViewLink,size)` +
      `&pageSize=100`;

    const response =
      await fetch(url);

    const data =
      await response.json();

    if (!response.ok) {
      return res.status(
        response.status
      ).json({
        success: false,
        message:
          "Google Drive API error",
        error: data,
      });
    }

    const files =
      (data.files || []).map(
        (file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          thumbnailLink:
            file.thumbnailLink ||
            null,
          webViewLink:
            file.webViewLink ||
            null,
          size:
            file.size || null,
        })
      );

    res.json({
      success: true,
      folderId: FOLDER_ID,
      total: files.length,
      files,
    });
  } catch (error) {
    console.error(
      "Google Drive error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Gagal mengambil data Google Drive",
      error: error.message,
    });
  }
});


/*
|--------------------------------------------------------------------------
| GOOGLE DRIVE THUMBNAIL PROXY
|--------------------------------------------------------------------------
|
| Frontend tidak mengambil thumbnail Google Drive
| secara langsung.
|
| Frontend:
|
| /api/google-drive/thumbnail/:fileId
|
| Backend:
|
| Google Drive API
|       ↓
| thumbnailLink
|       ↓
| image
|       ↓
| frontend
|
|--------------------------------------------------------------------------
*/

router.get(
  "/thumbnail/:fileId",
  async (req, res) => {
    try {
      const {
        fileId,
      } = req.params;

      const apiKey =
        process.env.GOOGLE_DRIVE_API_KEY;

      /*
      |--------------------------------------------------------------------------
      | VALIDASI API KEY
      |--------------------------------------------------------------------------
      */

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message:
            "GOOGLE_DRIVE_API_KEY belum ditemukan",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDASI FILE ID
      |--------------------------------------------------------------------------
      */

      if (!fileId) {
        return res.status(400).json({
          success: false,
          message:
            "File ID tidak ditemukan",
        });
      }

      console.log(
        "=== GOOGLE DRIVE THUMBNAIL ==="
      );

      console.log(
        "File ID:",
        fileId
      );

      /*
      |--------------------------------------------------------------------------
      | AMBIL METADATA FILE
      |--------------------------------------------------------------------------
      */

      const metadataUrl =
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          fileId
        )}` +
        `?fields=id,name,thumbnailLink,mimeType,size` +
        `&key=${apiKey}`;

      console.log(
        "Metadata URL:",
        metadataUrl
      );

      const metadataResponse =
        await fetch(
          metadataUrl
        );

      const metadata =
        await metadataResponse.json();

      console.log(
        "Metadata response:",
        metadata
      );

      /*
      |--------------------------------------------------------------------------
      | GOOGLE DRIVE ERROR
      |--------------------------------------------------------------------------
      */

      if (
        !metadataResponse.ok
      ) {
        return res.status(
          metadataResponse.status
        ).json({
          success: false,
          message:
            "Gagal mengambil metadata Google Drive",
          error: metadata,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | THUMBNAIL TIDAK TERSEDIA
      |--------------------------------------------------------------------------
      */

      if (
        !metadata.thumbnailLink
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Thumbnail tidak tersedia untuk file ini",
          file: metadata,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | AMBIL THUMBNAIL
      |--------------------------------------------------------------------------
      */

      console.log(
        "Thumbnail URL:",
        metadata.thumbnailLink
      );

      const imageResponse =
        await fetch(
          metadata.thumbnailLink
        );

      /*
      |--------------------------------------------------------------------------
      | ERROR SAAT MENGAMBIL IMAGE
      |--------------------------------------------------------------------------
      */

      if (
        !imageResponse.ok
      ) {
        console.error(
          "Thumbnail fetch error:",
          imageResponse.status,
          imageResponse.statusText
        );

        return res.status(
          imageResponse.status
        ).json({
          success: false,
          message:
            "Gagal mengambil thumbnail dari Google Drive",
          status:
            imageResponse.status,
          statusText:
            imageResponse.statusText,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | AMBIL CONTENT TYPE
      |--------------------------------------------------------------------------
      */

      const contentType =
        imageResponse.headers.get(
          "content-type"
        ) || "image/jpeg";

      /*
      |--------------------------------------------------------------------------
      | CONVERT IMAGE KE BUFFER
      |--------------------------------------------------------------------------
      */

      const imageBuffer =
        Buffer.from(
          await imageResponse.arrayBuffer()
        );

      /*
      |--------------------------------------------------------------------------
      | RESPONSE IMAGE
      |--------------------------------------------------------------------------
      */

      res.setHeader(
        "Content-Type",
        contentType
      );

      res.setHeader(
        "Content-Length",
        imageBuffer.length
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=3600"
      );

      /*
      |--------------------------------------------------------------------------
      | KIRIM IMAGE
      |--------------------------------------------------------------------------
      */

      res.send(
        imageBuffer
      );

    } catch (error) {
      console.error(
        "Thumbnail proxy error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Gagal mengambil thumbnail",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }
);


export default router;