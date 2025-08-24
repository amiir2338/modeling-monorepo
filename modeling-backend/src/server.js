// src/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger.js';
import router from './routes/index.js';
import authDebugRouter from './routes/auth.debug.route.js'; // فقط یک بار!
import path from 'path';
import 'dotenv/config';

// 🔌 برای Socket.io
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

// سرویس‌های پیام‌رسانی و نوتیف
import {
  sendMessage,
  markThreadRead,
  unreadThreadCount,
} from './services/messaging.service.js';
import { notify } from './services/notification.service.js';

const app = express();

// فایل‌های استاتیک آپلودها
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// ---------- Middlewares ----------
app.use(helmet());
app.use(
  cors({
    origin: (process.env.SOCKET_CORS_ORIGIN
      ? process.env.SOCKET_CORS_ORIGIN.split(',').map((s) => s.trim())
      : '*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(morgan('dev'));

// ---------- Docs ----------
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(swaggerSpec, null, 2));
});

// ---------- API Routes ----------
app.use('/api', router);                  // روتر اصلی
app.use('/api/v1/auth', authDebugRouter); // روت دیباگ: GET /api/v1/auth/me

// Ping & Home
app.get('/api/ping', (req, res) => res.json({ ok: true, msg: 'pong' }));
app.get('/', (req, res) => {
  res.send('Modeling backend is running ✅');
});

// ---------- DB & Server start ----------
const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || process.env.MONGO_URI;

// به‌جای app.listen از http.Server استفاده می‌کنیم تا io را بچسبانیم
const server = http.createServer(app);

// Socket.io با CORS کنترل‌شده
const io = new SocketIOServer(server, {
  cors: {
    origin: (process.env.SOCKET_CORS_ORIGIN
      ? process.env.SOCKET_CORS_ORIGIN.split(',').map((s) => s.trim())
      : '*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
});

// احراز هویت سوکت با JWT
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
  } catch (err) {
    return next(new Error('Unauthorized'));
  }
});

// هندل رویدادهای سوکت
io.on('connection', (socket) => {
  const uid = String(socket.user?._id || '');
  console.log('🔌 user connected:', uid);

  // هر کاربر وارد روم اختصاصی خودش می‌شود تا به‌طور مستقیم پیام دریافت کند
  if (uid) socket.join(`user:${uid}`);

  // کلاینت وقتی وارد صفحه‌ی گفتگوی یک Thread می‌شود این رویداد را می‌فرستد
  socket.on('thread:join', (threadId) => {
    if (!threadId) return;
    socket.join(String(threadId));
  });

  // ترک صفحه‌ی گفتگو
  socket.on('thread:leave', (threadId) => {
    if (!threadId) return;
    socket.leave(String(threadId));
  });

  // ارسال پیام جدید
  // payload: { applicationId, threadId?, text?, attachments? }
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

      // انتشار پیام به روم Thread و روم کاربر گیرنده
      const threadRoom = String(tid);
      const toUserId = message?.toUserId || message?.recipientId; // سازگاری با مدل
      io.to(threadRoom).emit('message:new', { message, threadId: tid });

      if (toUserId) {
        io.to(`user:${String(toUserId)}`).emit('message:new', { message, threadId: tid });

        // نوتیف «message» برای گیرنده (non-blocking)
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

  // مارک‌کردن خوانده‌شدن کل Thread توسط کاربر فعلی
  socket.on('thread:read', async (threadId, cb) => {
    try {
      if (!threadId) return cb?.({ ok: false, message: 'threadId is required' });
      const out = await markThreadRead(threadId, socket.user._id);

      // unread-count جدید این کاربر
      const cnt = await unreadThreadCount(socket.user._id);
      io.to(`user:${uid}`).emit('threads:unread-count', { count: cnt });

      cb?.(out);
    } catch (err) {
      console.error('[socket:thread:read]', err?.message || err);
      cb?.({ ok: false, message: err?.message || 'Server error' });
    }
  });

  // وضعیت تایپینگ
  socket.on('typing:start', (threadId) => {
    if (!threadId) return;
    socket.to(String(threadId)).emit('typing', { userId: uid, active: true });
  });
  socket.on('typing:stop', (threadId) => {
    if (!threadId) return;
    socket.to(String(threadId)).emit('typing', { userId: uid, active: false });
  });

  socket.on('disconnect', () => {
    console.log('🔌 user disconnected:', uid);
  });
});

// اتصال به دیتابیس و استارت سرور HTTP+Socket
mongoose
  .connect(MONGO_URL, {
    // در مانگوس 7 این گزینه‌ها اختیاری‌اند، مشکلی ندارند
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
      console.log('🔔 Socket.io ready');
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

/*
راهنما:
- در کلاینت وب‌سوکت، موقع اتصال:
  const socket = io('http://localhost:4000', { auth: { token: JWT } });

- رویدادها:
  socket.emit('thread:join', threadId)
  socket.emit('message:send', { applicationId, text: 'salam' }, (ack) => { ... })
  socket.on('message:new', (evt) => { ... })
  socket.emit('thread:read', threadId, (ack) => { ... })
  socket.on('threads:unread-count', ({ count }) => { ... })
  socket.on('typing', ({ userId, active }) => { ... })
*/
