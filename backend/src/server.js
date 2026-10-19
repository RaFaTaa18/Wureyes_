import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import pool from "./db.js";
import { authenticateToken, requireAdmin } from "./middlware/auth.js";

import portfolioRoutes from "./routes/portfolio.js";
import servicesRoutes from "./routes/services.js";
import bookingsRoutes from "./routes/bookings.js";
import messagesRoutes from "./routes/messages.js";
import testimonialsRoutes from "./routes/testimonials.js";
import authRoutes from "./routes/auth.js";
import categoriesRoutes from "./routes/categories.js";
import googleDriveRoutes from "./routes/googleDrive.js";
import photoSelectionRoutes from "./routes/photoSelection.js";
import dashboardRoutes from "./routes/dashboard.js";

dotenv.config();

const app = express();

// Trust only local reverse proxies (Nginx on this VPS) for client IP forwarding.
app.set("trust proxy", "loopback");

const allowedOrigins = new Set([
  "https://wureyes.link",
  "https://www.wureyes.link",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    dotfiles: "deny",
    index: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (e.g. server-to-server) are not browser CORS requests.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/testimonials", testimonialsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/google-drive", googleDriveRoutes);
app.use("/api/photo-selection", photoSelectionRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Wureyes API is running",
  });
});

// Restrict database health checks to authenticated administrators.
app.get(
  "/api/test-db",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await pool.query("SELECT 1");

      return res.json({
        success: true,
        message: "Database connected successfully",
      });
    } catch (error) {
      console.error("Database health check failed:", error);

      return res.status(500).json({
        success: false,
        message: "Database connection failed",
      });
    }
  }
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Wureyes API running on port ${PORT}`);
});
