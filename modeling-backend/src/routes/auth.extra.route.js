// src/routes/auth.extra.route.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { authRequired } from '../middlewares/auth.middleware.js';
const router = Router();
function sign(user) { return jwt.sign({ userId:user._id, role:user.role }, process.env.JWT_SECRET, { expiresIn:'7d' }); }
router.post('/register', async (req, res) => {
  try {
    const { email, password, role='model', name } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok:false, message:'ایمیل و رمز لازم است' });
    if (!['model','client','admin'].includes(role)) return res.status(400).json({ ok:false, message:'نقش نامعتبر' });
    const exist = await User.findOne({ email }); if (exist) return res.status(409).json({ ok:false, message:'ایمیل قبلاً ثبت شده است' });
    const hash = await bcrypt.hash(password, 10);
    const u = await User.create({ email, password: hash, role, name, isActive:true });
    const token = sign(u);
    res.json({ ok:true, token, user:{ _id:u._id, email:u.email, role:u.role, name:u.name ?? null } });
  } catch(e){ res.status(500).json({ ok:false, message:'ثبت‌نام ناموفق' }); }
});
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) return res.status(400).json({ ok:false, message:'ایمیل و رمز جدید لازم است' });
    const u = await User.findOne({ email }); if (!u) return res.status(404).json({ ok:false, message:'کاربر یافت نشد' });
    u.password = await bcrypt.hash(newPassword, 10); await u.save();
    res.json({ ok:true, message:'رمز عبور تغییر کرد' });
  } catch(e){ res.status(500).json({ ok:false, message:'عملیات ناموفق' }); }
});
router.get('/me', authRequired, async (req, res) => {
  try {
    const u = await User.findById(req.user._id).lean(); if (!u) return res.status(404).json({ ok:false, message:'کاربر یافت نشد' });
    res.json({ ok:true, user:{ _id:u._id, email:u.email, role:u.role, name:u.name ?? null, avatar:u.avatar ?? null } });
  } catch(e){ res.status(500).json({ ok:false, message:'خطای سرور' }); }
});
export default router;
