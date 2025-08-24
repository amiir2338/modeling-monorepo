// src/routes/jobs.debug.route.js
import { Router } from 'express';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * GET /api/v1/jobs/_debug_auth
 * هویتِ resolve شده توسط middleware را نشان می‌دهد.
 */
router.get('/_debug_auth', authRequired, (req, res) => {
  res.json({
    ok: true,
    user: req.user || null,
    role: req.user?.role || null,
    haveClientId: Boolean(req.user?.clientId),
  });
});

export default router;
