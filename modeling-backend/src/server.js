// src/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import router from './routes/index.js';
import swaggerSpec from './docs/swagger.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// --- Core middlewares ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS (allow dev front by default)
const FRONT = process.env.FRONT_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: (origin, cb) => cb(null, origin || FRONT),
  credentials: true,
}));

app.use(helmet());
app.use(morgan('dev'));

// Static uploads
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api', router);

// Health shortcut
app.get('/health', (req, res) => res.json({ ok: true, service: 'modeling-backend', time: new Date().toISOString() }));

// Error handler
app.use(errorHandler);

// --- DB & server bootstrap ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/modeling';
const PORT = Number(process.env.PORT || 4000);

mongoose.connect(MONGO_URI)
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
