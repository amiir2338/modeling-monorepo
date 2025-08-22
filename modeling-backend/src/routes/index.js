// src/routes/index.js
import { Router } from 'express';

// ---- Feature routers ----
import healthRouter from './health.route.js';
import authRouter from './auth.route.js';
import authExtraRoute from './auth.extra.route.js';
import userMeRoute from './user.me.route.js';
import uploadRoute from './upload.route.js';

import jobsRouter from './jobs.route.js';
import jobsModerationRoute from './jobs.moderation.route.js'; // approve/reject
import applicationsRoute from './applications.route.js';      // /v1/jobs/:id/apply & /v1/jobs/:id/applications

// ---- Generic CRUD ----
import { makeCrudRouter } from '../utils/makeCrud.js';
import Model from '../models/model.model.js';
import Client from '../models/client.model.js';

const router = Router();

// Health
router.use('/health', healthRouter);

// Auth
router.use('/v1/auth', authRouter);
router.use('/v1/auth', authExtraRoute);

// User (me)
router.use('/v1/users', userMeRoute);

// Uploads
router.use('/v1/upload', uploadRoute);

// Generic CRUD
router.use('/v1/models', makeCrudRouter(Model));
router.use('/v1/clients', makeCrudRouter(Client));

// Jobs
router.use('/v1/jobs', jobsRouter);
router.use('/v1/jobs', jobsModerationRoute); // POST /:id/approve, /:id/reject

// Applications (apply/list)
router.use('/', applicationsRoute); // defines /v1/jobs/:id/apply & /v1/jobs/:id/applications

export default router;
