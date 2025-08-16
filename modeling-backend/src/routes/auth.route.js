// src/routes/auth.route.js
import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { authLimiter } from '../middlewares/ratelimit.middleware.js';

const router = Router();

// روی مسیرهای حساس محدودیت اعمال می‌کنیم
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

export default router;
