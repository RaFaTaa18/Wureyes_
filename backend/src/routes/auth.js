import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import { promisify } from "node:util";
import pool from "../db.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const [users] = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        password,
        role
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.role !== "admin" && user.role !== "editor") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access the dashboard",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, current password, and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    const [users] = await pool.query(
      `
      SELECT id, email, password
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await pool.query(
      `
      UPDATE users
      SET password = ?
      WHERE id = ?
      `,
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
});


const randomBytes = promisify(crypto.randomBytes);
const RESET_TOKEN_TTL_MINUTES = 15;
const genericResetResponse = {
  success: true,
  message: "If an eligible account exists, a password reset link will be sent to its email address.",
};

function getMailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP is not configured");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function getFrontendBaseUrl() {
  const baseUrl = process.env.FRONTEND_URL;
  if (!baseUrl) throw new Error("FRONTEND_URL is not configured");
  return baseUrl.replace(/\/$/, "");
}

router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(200).json(genericResetResponse);
    }

    const [users] = await pool.query(
      "SELECT id, name, email FROM users WHERE LOWER(email) = ? AND role IN ('admin', 'editor') LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(200).json(genericResetResponse);
    }

    const user = users[0];
    const rawToken = (await randomBytes(32)).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = ?", [user.id]);
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))",
      [user.id, tokenHash, RESET_TOKEN_TTL_MINUTES]
    );

    const resetUrl = `${getFrontendBaseUrl()}/admin/reset-password?token=${encodeURIComponent(rawToken)}`;
    const transport = getMailTransport();
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: "Reset your Wureyes admin password",
      text: `Hello ${user.name || "Wureyes user"},\n\nUse this link to reset your password within ${RESET_TOKEN_TTL_MINUTES} minutes:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111"><h2>WUREYES_</h2><p>Hello ${String(user.name || "Wureyes user").replace(/[&<>"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]))},</p><p>We received a request to reset your Wureyes admin password.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none">Reset password</a></p><p>This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes and can only be used once.</p><p>If you did not request this, you can ignore this email.</p></div>`,
    });

    return res.status(200).json(genericResetResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    // Keep the response generic to avoid account enumeration, including when SMTP is unavailable.
    return res.status(200).json(genericResetResponse);
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ success: false, message: "Reset link is invalid or has expired." });
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      return res.status(400).json({ success: false, message: "Password must be between 12 and 128 characters." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [rows] = await pool.query(
      `SELECT prt.id AS reset_id, prt.user_id
       FROM password_reset_tokens prt
       INNER JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = ? AND prt.used_at IS NULL
         AND prt.expires_at > UTC_TIMESTAMP()
         AND u.role IN ('admin', 'editor')
       LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "Reset link is invalid or has expired." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [validTokens] = await connection.query(
        "SELECT id, user_id FROM password_reset_tokens WHERE id = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP() FOR UPDATE",
        [rows[0].reset_id]
      );
      if (validTokens.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Reset link is invalid or has expired." });
      }

      await connection.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, rows[0].user_id]);
      await connection.query("UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL", [rows[0].user_id]);
      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }

    return res.json({ success: true, message: "Password reset successfully. You can now sign in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Unable to reset password right now." });
  }
});


export default router;