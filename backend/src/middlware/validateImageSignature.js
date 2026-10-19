import fs from "fs/promises";

const SIGNATURES = {
  "image/jpeg": (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,
  "image/jpg": (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,
  "image/png": (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    ),
  "image/webp": (buffer) =>
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP",
};

export default async function validateImageSignature(req, res, next) {
  if (!req.file) {
    return next();
  }

  let handle;

  try {
    handle = await fs.open(req.file.path, "r");
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const signatureCheck = SIGNATURES[req.file.mimetype];

    if (!signatureCheck || !signatureCheck(header.subarray(0, bytesRead))) {
      await handle.close();
      handle = null;
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "File harus berupa gambar JPG, PNG, atau WEBP yang valid.",
      });
    }

    await handle.close();
    handle = null;
    return next();
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
    }

    await fs.unlink(req.file.path).catch(() => {});
    console.error("Image signature validation failed:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memvalidasi file gambar.",
    });
  }
}
