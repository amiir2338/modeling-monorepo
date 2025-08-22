// src/routes/user.me.route.js
import { Router } from 'express';
import { authRequired } from '../middlewares/auth.middleware.js';
import User from '../models/user.model.js';
const router = Router();
router.put('/me', authRequired, async (req, res) => {
  try {
    const { name, avatar } = req.body || {};
    const u = await User.findByIdAndUpdate(req.user._id, { $set: { name, avatar } }, { new: true });
    res.json({ ok:true, user:{ _id:u._id, email:u.email, role:u.role, name:u.name ?? null, avatar:u.avatar ?? null } });
  } catch(e){ res.status(500).json({ ok:false, message:'به‌روزرسانی ناموفق' }); }
});
export default router;
