import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import pool from "./db.js";

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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "../uploads")
  )
);

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/portfolio", portfolioRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/testimonials", testimonialsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/google-drive", googleDriveRoutes);
app.use( "/api/photo-selection", photoSelectionRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Wureyes API is running",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT 1 AS connected"
    );

    res.json({
      success: true,
      message: "Database connected successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Database error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Wureyes API running on http://localhost:${PORT}`
  );
});