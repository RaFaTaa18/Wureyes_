const DEFAULT_WINDOW_MS = 60 * 1000;
const MAX_TRACKED_CLIENTS = 10000;

/**
 * Small in-memory rate limiter for a single Node process.
 * Configure Express trust proxy narrowly (loopback) when running behind local Nginx.
 */
export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = 120,
  message = "Too many requests. Please try again shortly.",
} = {}) {
  const clients = new Map();
  let requestsSinceCleanup = 0;

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let entry = clients.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      clients.set(key, entry);
    }

    entry.count += 1;
    requestsSinceCleanup += 1;

    if (requestsSinceCleanup >= 100 || clients.size > MAX_TRACKED_CLIENTS) {
      requestsSinceCleanup = 0;

      for (const [clientKey, clientEntry] of clients) {
        if (now >= clientEntry.resetAt) {
          clients.delete(clientKey);
        }
      }

      while (clients.size > MAX_TRACKED_CLIENTS) {
        const oldestKey = clients.keys().next().value;
        if (oldestKey === undefined) break;
        clients.delete(oldestKey);
      }
    }

    res.setHeader("RateLimit-Limit", maxRequests);
    res.setHeader(
      "RateLimit-Remaining",
      Math.max(0, maxRequests - entry.count)
    );
    res.setHeader(
      "RateLimit-Reset",
      Math.ceil(entry.resetAt / 1000)
    );

    if (entry.count > maxRequests) {
      res.setHeader(
        "Retry-After",
        Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
      );

      return res.status(429).json({
        success: false,
        message,
      });
    }

    return next();
  };
}
