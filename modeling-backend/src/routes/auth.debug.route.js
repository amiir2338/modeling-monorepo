// src/routes/auth.debug.route.js
import { Router } from 'express';
// اگر اسم میدلورت فرق می‌کنه (مثلاً requireAuth)، همونو جایگزین کن
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/me', authRequired, (req, res) => {
  return res.json({ ok: true, user: req.user });
});

export default router;
