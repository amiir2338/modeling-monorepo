// src/routes/upload.route.js
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authRequired } from '../middlewares/auth.middleware.js';
const router = Router();
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname||'');
    const base = path.basename(file.originalname||'file', ext).replace(/\s+/g,'_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});
const upload = multer({ storage });
router.post('/', authRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok:false, message:'فایل ارسال نشده است' });
    res.json({ ok:true, url:`/uploads/${req.file.filename}`, filename:req.file.filename });
  } catch (e) {
    res.status(500).json({ ok:false, message:'Upload failed' });
  }
});
export default router;
