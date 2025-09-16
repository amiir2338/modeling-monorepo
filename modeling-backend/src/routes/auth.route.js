// src/routes/auth.route.js
// 🔐 فقط ثبت‌نام و ورود (logout در auth.extra.route.js هندل می‌شود)

import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', register);

// POST /api/v1/auth/login
router.post('/login', login);

export default router;
