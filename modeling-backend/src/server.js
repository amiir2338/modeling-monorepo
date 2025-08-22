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

import 'dotenv/config';

const app = express();
import path from 'path';
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// ---------- Middlewares ----------
app.use(helmet());
app.use(
  cors({
    origin: '*',
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
app.use('/api', router);                 // روتر اصلی
app.use('/api/v1/auth', authDebugRouter); // روت دیباگ: GET /api/v1/auth/me

// Ping & Home
app.get('/api/ping', (req, res) => res.json({ ok: true, msg: 'pong' }));
app.get('/', (req, res) => {
  res.send('Modeling backend is running ✅');
});

// ---------- DB & Server start ----------
const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGO_URL, {
    // در مانگوس 7 این گزینه‌ها اختیاری‌اند، مشکلی ندارند
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
