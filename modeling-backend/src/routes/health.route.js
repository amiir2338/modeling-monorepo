import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'modeling-backend',
    time: new Date().toISOString()
  });
});

export default router;
