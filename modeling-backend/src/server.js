// src/server.js
// 🟢 سرور HTTP + Socket.IO + CORS/Cookies + Swagger + Mongo
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger.js';
import router from './routes/index.js';
import path from 'path';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

// روت‌های دیباگ (اختیاری)
import debugRouter from './routes/_debug.route.js';

// سرویس‌های realtime (اختیاری)
import {
  sendMessage,
  markThreadRead,
  unreadThreadCount,
} from './services/messaging.service.js';
import { notify } from './services/notification.service.js';

const app = express();
app.set('trust proxy', 1);

// Provide a sensible default JWT_SECRET in development to avoid 500s during local E2E
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_tests_please_change';
}

// ===== Static files (uploads) =====
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// ===== Security headers (helmet) =====
// جلوگیری از بلاک‌شدن تصاویر/فایل‌های استاتیک و iframeهای Swagger
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);

// ===== CORS (cookies-friendly) =====
const parseOrigins = (val) => {
  if (!val) return ['http://localhost:3000'];
  if (Array.isArray(val)) return val;
  return String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};
const ORIGINS = parseOrigins(
  process.env.FRONT_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000'
);

const corsConfig = {
  origin: (origin, cb) => {
    // اجازه برای Postman/Server-to-Server (بدون اوریجین)
    if (!origin) return cb(null, true);
    if (ORIGINS.includes(origin)) return cb(null, true);
    // اگر لازم داری سخت‌گیر باشی، cb(new Error('Not allowed by CORS'))
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsConfig));
app.options('*', cors(corsConfig));

// ===== Parsers & logs =====
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ===== Rate limit (Auth) =====
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1/auth', authLimiter);

// ===== Debug & Docs =====
app.use('/api/v1/_debug', debugRouter);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(swaggerSpec, null, 2));
});

// ===== APIs =====
// نکته: در router اصلی معمولاً '/v1' اضافه می‌شود؛ بنابراین آدرس‌ها /api/v1/... خواهند شد.
app.use('/api', router);

// Mount legacy auth paths (some tests expect /api/auth/* instead of /api/v1/auth)
// This forwards /api/auth/... to the v1 auth router already registered under /api/v1/auth
app.use('/api/auth', (req, res, next) => {
  // rewrite path: /api/auth/x -> /api/v1/auth/x
  req.url = req.url.replace(/^\/?/, '/');
  req.url = '/v1/auth' + req.url;
  return router.handle(req, res, next);
});

// Health & root
app.get('/api/ping', (_req, res) => res.json({ ok: true, msg: 'pong' }));
app.get('/', (_req, res) => res.send('Modeling backend is running ✅'));

// 404 handler برای مسیرهای API
app.use('/api', (req, res, next) => {
  if (res.headersSent) return next();
  return res.status(404).json({ ok: false, message: 'Not found' });
});

// Error handler سراسری
app.use((err, _req, res, _next) => {
  const status = err?.status || 500;
  const message = err?.message || 'Server error';
  console.error('[ERROR]', message, err?.stack || err);
  if (res.headersSent) return; // اجتناب از ارسال دوباره
  res.status(status).json({ ok: false, message });
});

// ===== HTTP + Socket.IO =====
const PORT = process.env.PORT || 4000;
let MONGO_URL = process.env.MONGO_URL || process.env.MONGO_URI;

// Fallback: start an in-memory MongoDB if none is provided (useful for local E2E)
async function ensureMongo() {
  if (MONGO_URL) return MONGO_URL;
  try {
    // Lazy-load to avoid adding to production bundle
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const m = await MongoMemoryServer.create();
    MONGO_URL = m.getUri();
    console.log('🧪 Started in-memory MongoDB for testing at', MONGO_URL);
    return MONGO_URL;
  } catch (e) {
    console.error('❌ MONGO_URL not set and mongodb-memory-server unavailable.');
    process.exit(1);
  }
}

const server = http.createServer(app);

// Socket.IO با همان CORS
const io = new SocketIOServer(server, {
  cors: { ...corsConfig },
});

// احراز هویت سوکت با JWT (اختیاری)
io.use((socket, next) => {
  try {
    const tokenFromAuth = socket.handshake?.auth?.token;
    const bearer = socket.handshake?.headers?.authorization;
    const token =
      tokenFromAuth ||
      (bearer && bearer.startsWith('Bearer ') ? bearer.slice(7) : null);

    if (!token) return next(new Error('No token'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { _id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch (e) {
    return next(new Error('Unauthorized'));
  }
});

// رویدادهای سوکت
io.on('connection', (socket) => {
  const uid = String(socket.user?._id || '');
  console.log('🔌 user connected:', uid);
  if (uid) socket.join(`user:${uid}`);

  socket.on('thread:join', (threadId) => {
    if (threadId) socket.join(String(threadId));
  });
  socket.on('thread:leave', (threadId) => {
    if (threadId) socket.leave(String(threadId));
  });

  socket.on('message:send', async (payload, cb) => {
    try {
      const { applicationId, threadId, text = '', attachments = [] } = payload || {};
      const { message, threadId: tid } = await sendMessage({
        senderId: socket.user._id,
        applicationId,
        threadId,
        text,
        attachments,
      });
      const toUserId = message?.toUserId || message?.recipientId;

      io.to(String(tid)).emit('message:new', { message, threadId: tid });
      if (toUserId) {
        io.to(`user:${String(toUserId)}`).emit('message:new', { message, threadId: tid });
        try {
          await notify(toUserId, 'message', {
            threadId: tid,
            applicationId: message.applicationId,
            messageId: message._id,
          });
        } catch (e) {
          console.error('[socket:notify(message)]', e?.message || e);
        }
      }
      cb?.({ ok: true, data: { message, threadId: tid } });
    } catch (err) {
      console.error('[socket:message:send]', err?.message || err);
      cb?.({ ok: false, message: err?.message || 'Server error' });
    }
  });

  socket.on('thread:read', async (threadId, cb) => {
    try {
      if (!threadId) return cb?.({ ok: false, message: 'threadId is required' });
      const out = await markThreadRead(threadId, socket.user._id);
      const cnt = await unreadThreadCount(socket.user._id);
      io.to(`user:${uid}`).emit('threads:unread-count', { count: cnt });
      cb?.(out);
    } catch (err) {
      console.error('[socket:thread:read]', err?.message || err);
      cb?.({ ok: false, message: err?.message || 'Server error' });
    }
  });

  socket.on('typing:start', (threadId) => {
    if (threadId) socket.to(String(threadId)).emit('typing', { userId: uid, active: true });
  });
  socket.on('typing:stop', (threadId) => {
    if (threadId) socket.to(String(threadId)).emit('typing', { userId: uid, active: false });
  });

  socket.on('disconnect', () => {
    console.log('🔌 user disconnected:', uid);
  });
});

// ===== DB + Start =====
ensureMongo()
  .then((url) => mongoose.connect(url))
  .then(() => {
    console.log('✅ MongoDB connected');
    // Bind to all interfaces to avoid platform-specific loopback issues.
    // Using '0.0.0.0' makes the server reachable via localhost, 127.0.0.1 and
    // other host addresses during E2E runs.
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
      console.log('🔔 Socket.io ready');
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
