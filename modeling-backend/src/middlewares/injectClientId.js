// src/middlewares/injectClientId.js
export function injectClientId(req, res, next) {
  try {
    const u = req.user || {};
    if (!req.body) req.body = {};

    if (!req.body.clientId) {
      if (u.clientId) {
        req.body.clientId = u.clientId;      // حالت ایده‌آل
      } else if (u.role === 'client' && u.sub) {
        // fallback: اگر schema شما اجازه می‌دهد، خود user id را به عنوان clientId بپذیرید
        req.body.clientId = u.sub;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}
