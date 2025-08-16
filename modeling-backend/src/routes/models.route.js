import { Router } from 'express';
import { registerModel, listModels, getModelById } from '../controllers/model.controller.js';

const router = Router();

// ترتیب مهمه: روت‌های ساده قبل از روت‌های پارامتری
router.get('/', listModels);        // GET /api/v1/models
router.post('/', registerModel);    // POST /api/v1/models
router.get('/:id', getModelById);   // GET /api/v1/models/:id

export default router;
