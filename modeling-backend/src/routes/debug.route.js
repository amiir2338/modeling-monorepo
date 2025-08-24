// src/routes/debug.route.js
import { Router } from 'express';
import mongoose from 'mongoose';

const r = Router();

r.get('/env', (req, res) => {
  res.json({
    ok: true,
    env: {
      PORT: process.env.PORT || null,
      JWT_SECRET_SET: !!process.env.JWT_SECRET,
      CORS_ORIGIN: process.env.CORS_ORIGIN || null,
      NODE_ENV: process.env.NODE_ENV || null,
    },
    mongo: {
      readyState: mongoose.connection?.readyState ?? -1, // 1 = connected
    },
    time: new Date().toISOString(),
  });
});

export default r;
