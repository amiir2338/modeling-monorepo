// src/routes/_debug.route.js
import { Router } from 'express';

const router = Router();

/* ELI5: این مسیرها فقط برای دیباگ هستند:
   - /api/v1/_debug/whoami : برمی‌گرداند سرور شما چه کوکی و چه user ای می‌بیند
   - /api/v1/_debug/cookies : فقط کوکی‌ها و هدرها را echo می‌کند
*/

router.get('/whoami', (req, res) => {
  return res.json({
    ok: true,
    ip: req.ip,
    url: req.originalUrl || req.url,
    cookies: req.cookies || {},
    // اگر میدل‌وِر auth شما user را روی req می‌گذارد، اینجا دیده می‌شود
    user: req.user || null,
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent'],
      cookie: req.headers.cookie || null,
    },
  });
});

router.get('/cookies', (req, res) => {
  return res.json({
    ok: true,
    cookies: req.cookies || {},
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      cookie: req.headers.cookie || null,
    },
  });
});

export default router;
