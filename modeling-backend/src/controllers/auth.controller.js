// src/controllers/auth.controller.js
import bcrypt from 'bcryptjs'; // ← نسخه JS خالص، بدون دردسر Native
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/user.model.js';
import Client from '../models/client.model.js';

function ensureJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
}
function signToken(user) {
  ensureJwtSecret();
  const payload = { sub: String(user._id), role: user.role, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ورودی‌ها
const registerSchema = z.object({
  email: z.string().email({ message: 'ایمیل معتبر نیست' }),
  password: z.string().min(6, { message: 'گذرواژه حداقل 6 کاراکتر' }),
  name: z.string().optional().nullable(),
  role: z.enum(['model', 'client', 'admin']).optional().default('model'),
  modelId: z.string().nullish(),
  clientId: z.string().nullish(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const register = async (req, res) => {
  try {
    const data = registerSchema.parse(req.body || {});
    const email = String(data.email).toLowerCase().trim();

    // اگر ایمیل قبلاً هست
    const exists = await User.findOne({ email }).lean();
    if (exists) return res.status(409).json({ ok: false, message: 'این ایمیل قبلاً ثبت شده است' });

    const hash = await bcrypt.hash(data.password, 10);

    // ⚠️ مهم: اگر نقش client است، اول Client را بساز تا اگر schema یوزر clientId را required کرده، خطا نگیریم.
    let clientId = data.clientId ?? null;
    if (data.role === 'client' && !clientId) {
      const createdClient = await Client.create({
        name: (data.name ?? email.split('@')[0]) || email.split('@')[0],
        email,
      });
      clientId = createdClient._id;
    }

    const user = await User.create({
      email,
      password: hash,
      role: data.role || 'model',
      name: data.name ?? null,
      modelId: data.modelId ?? null,
      clientId: clientId ?? null,
    });

    const token = signToken(user);
    return res.status(201).json({
      ok: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          name: user.name ?? null,
          modelId: user.modelId ?? null,
          clientId: user.clientId ?? null,
        },
        token,
      },
    });
  } catch (err) {
    // لاگ کامل در سرور برای عیب‌یابی
    console.error('register error:', {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      errors: err?.errors,
    });
    // پیام یکنواخت سمت کلاینت
    if (err?.issues?.length) {
      return res.status(400).json({ ok: false, message: err.issues[0]?.message || 'Invalid input' });
    }
    return res.status(500).json({ ok: false, message: 'ثبت‌نام ناموفق بود' });
  }
};

export const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body || {});
    const email = String(data.email).toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ ok: false, message: 'ایمیل یا گذرواژه نادرست است' });

    const ok = await bcrypt.compare(data.password, user.password);
    if (!ok) return res.status(401).json({ ok: false, message: 'ایمیل یا گذرواژه نادرست است' });

    // Self-heal: اگر client است و clientId ندارد، بساز و وصل کن
    if (user.role === 'client' && !user.clientId) {
      const client = await Client.create({
        name: user.name || user.email.split('@')[0],
        email: user.email,
      });
      user.clientId = client._id;
      await user.save();
    }

    const token = signToken(user);
    return res.json({
      ok: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          name: user.name ?? null,
          modelId: user.modelId ?? null,
          clientId: user.clientId ?? null,
        },
        token,
      },
    });
  } catch (err) {
    console.error('login error:', {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      errors: err?.errors,
    });
    if (err?.issues?.length) {
      return res.status(400).json({ ok: false, message: err.issues[0]?.message || 'Invalid input' });
    }
    return res.status(500).json({ ok: false, message: 'لاگین ناموفق بود' });
  }
};

export const me = async (req, res) => {
  try {
    const u = req.user;
    if (!u) return res.status(401).json({ ok: false, message: 'توکن لازم است' });
    return res.json({ ok: true, data: { user: u } });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};
