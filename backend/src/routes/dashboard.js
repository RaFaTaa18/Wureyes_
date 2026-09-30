import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/stats", async (req, res) => {
  try {
    const [
      [portfolioRows],
      [servicesRows],
      [bookingsRows],
      [pendingBookingsRows],
      [messagesRows],
      [unreadMessagesRows],
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM portfolio"),

      pool.query("SELECT COUNT(*) AS total FROM services"),

      pool.query("SELECT COUNT(*) AS total FROM bookings"),

      pool.query(`
        SELECT COUNT(*) AS total
        FROM bookings
        WHERE status = 'pending'
      `),

      pool.query("SELECT COUNT(*) AS total FROM messages"),

      pool.query(`
        SELECT COUNT(*) AS total
        FROM messages
        WHERE status = 'unread'
      `),
    ]);

    res.json({
      success: true,
      data: {
        portfolio: Number(portfolioRows[0].total),
        services: Number(servicesRows[0].total),
        bookings: Number(bookingsRows[0].total),
        pendingBookings: Number(pendingBookingsRows[0].total),
        messages: Number(messagesRows[0].total),
        unreadMessages: Number(unreadMessagesRows[0].total),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;