// src/controllers/auth.controller.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/user.model.js';
import Client from '../models/client.model.js';

const registerSchema = z.object({
  email: z.string().email({ message: 'ایمیل معتبر نیست' }),
  password: z.string().min(6, { message: 'گذرواژه حداقل 6 کاراکتر' }),
  name: z.string().optional().nullable(),
  role: z.enum(['model', 'client', 'admin']).optional().default('model'),
  modelId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'ایمیل معتبر نیست' }),
  password: z.string().min(6, { message: 'گذرواژه حداقل 6 کاراکتر' }),
});

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      clientId: user.clientId ? user.clientId.toString() : null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/v1/auth/register
export const register = async (req, res) => {
  try {
    const data = registerSchema.parse(req.body || {});
    const exists = await User.findOne({ email: data.email });
    if (exists) return res.status(409).json({ ok: false, message: 'این ایمیل قبلاً ثبت شده است' });

    const hash = await bcrypt.hash(data.password, 10);
    let user = await User.create({
      email: data.email,
      password: hash,
      name: data.name ?? null,
      role: data.role ?? 'model',
      modelId: data.modelId ?? null,
      clientId: data.clientId ?? null,
    });

    // اگر نقش کلاینت است و هنوز clientId ندارد، همین‌جا بساز و وصل کن
    if (user.role === 'client' && !user.clientId) {
      const client = await Client.create({
        user: user._id,
        name: user.name ?? undefined,
        email: user.email,
      });
      user.clientId = client._id;
      await user.save();
    }

    const token = signToken(user);
    return res.status(201).json({
      ok: true,
      data: {
        _id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        modelId: user.modelId,
        clientId: user.clientId,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    if (err?.issues?.length) {
      return res.status(400).json({ ok: false, message: err.issues[0].message });
    }
    console.error('register error:', err);
    return res.status(500).json({ ok: false, message: 'ثبت‌نام ناموفق بود' });
  }
};

// POST /api/v1/auth/login
export const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body || {});
    let user = await User.findOne({ email: data.email });
    if (!user) return res.status(401).json({ ok: false, message: 'ایمیل یا گذرواژه نادرست است' });

    const ok = await bcrypt.compare(data.password, user.password);
    if (!ok) return res.status(401).json({ ok: false, message: 'ایمیل یا گذرواژه نادرست است' });

    // اگر کلاینت است ولی clientId ندارد، خودکار بساز
    if (user.role === 'client' && !user.clientId) {
      const client = await Client.create({
        user: user._id,
        name: user.name ?? undefined,
        email: user.email,
      });
      user.clientId = client._id;
      await user.save();
    }

    const token = signToken(user);
    return res.json({
      ok: true,
      data: {
        _id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        modelId: user.modelId,
        clientId: user.clientId,
      },
      token,
    });
  } catch (err) {
    if (err?.issues?.length) {
      return res.status(400).json({ ok: false, message: err.issues[0].message });
    }
    console.error('login error:', err);
    return res.status(500).json({ ok: false, message: 'لاگین ناموفق بود' });
  }
};
