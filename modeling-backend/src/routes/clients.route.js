import { Router } from 'express';
import { registerClient, listClients } from '../controllers/client.controller.js';

const router = Router();

// GET /api/v1/clients → لیست کارفرماها
router.get('/', listClients);

// POST /api/v1/clients → ثبت کارفرما
router.post('/', registerClient);

export default router;
