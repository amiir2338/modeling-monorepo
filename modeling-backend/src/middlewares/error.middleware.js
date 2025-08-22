// src/middlewares/error.middleware.js
export function errorHandler(err, req, res, next) {
  console.error("ErrorHandler:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ ok: false, message: err.message || "Server error", details: err.details || null });
}
