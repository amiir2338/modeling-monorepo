// src/routes/index.js
import { Router } from 'express';
import healthRouter from './health.route.js';

// مدل‌ها (Mongoose)
import Model from '../models/model.model.js';
import Client from '../models/client.model.js';

// CRUD جنریک
import { makeCrudRouter } from '../utils/makeCrud.js';

// 🔒 Jobs اختصاصی با مالکیت
import jobsRouter from './jobs.route.js';

// Auth
import authRouter from './auth.route.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/v1/auth', authRouter);

// جنریک برای models/clients
router.use('/v1/models', makeCrudRouter(Model));
router.use('/v1/clients', makeCrudRouter(Client));

// اختصاصی برای jobs (با مالکیت و نقش‌ها)
router.use('/v1/jobs', jobsRouter);

export default router;
