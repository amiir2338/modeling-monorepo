// src/routes/profiles.route.js
import express from 'express';
import { authRequired, requireRoles } from '../middlewares/auth.middleware.js';
import {
  getMyModelProfile, updateMyModelProfile, getModelProfilePublic, listModels,
  getMyClientProfile, updateMyClientProfile, getClientProfilePublic, listClients
} from '../controllers/profile.controller.js';

const router = express.Router();

// Public lists
router.get('/v1/model-profiles', listModels);
router.get('/v1/client-profiles', listClients);

// Public single
router.get('/v1/model-profiles/:userId', getModelProfilePublic);
router.get('/v1/client-profiles/:userId', getClientProfilePublic);

// Me (model)
router.get('/v1/me/model-profile', authRequired, requireRoles('model'), getMyModelProfile);
router.patch('/v1/me/model-profile', authRequired, requireRoles('model'), updateMyModelProfile);

// Me (client)
router.get('/v1/me/client-profile', authRequired, requireRoles('client'), getMyClientProfile);
router.patch('/v1/me/client-profile', authRequired, requireRoles('client'), updateMyClientProfile);

export default router;
