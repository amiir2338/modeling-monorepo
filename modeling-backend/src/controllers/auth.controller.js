// src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/user.model.js';
import Client from '../models/client.model.js';

/* ---------- Helpers ---------- */
const toStringOrNull = (v) => (v ? String(v) : null);

function ensureJwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
}
function signToken(user) {
  ensureJwtSecret();
  const payload = { sub: String(user._id), role: user.role, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

/* ---------- Schemas ---------- */
const registerSchema = z.object({
  email: z.string().email({ message: 'ایمیل معتبر نیست' }),
  password: z.string().min(6, { message: 'گذرواژه حداقل 6 کاراکتر' }),
  name: z.string().optional().nullable(),
  role: z.enum(['model', 'client', 'admin']).optional().default('client'),
  modelId: z.string().nullish(),
  clientId: z.string().nullish(),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/* خروجی امن برای کلاینت (ObjectId → string فقط برای نمایش) */
const safeUser = (u) => ({
  _id: String(u._id),
  email: u.email,
  role: u.role,
  name: u.name ?? null,
  modelId: toStringOrNull(u.modelId),
  clientId: toStringOrNull(u.clientId),
});

/* ---------- Controllers ---------- */
export const register = async (req, res) => {
  try {
    const data = registerSchema.parse(req.body || {});
    const email = String(data.email).toLowerCase().trim();

    // 1) ایمیل تکراری نباشد
    const exists = await User.findOne({ email }).lean();
    if (exists) {
      return res.status(409).json({ ok: false, message: 'این ایمیل قبلاً ثبت شده است' });
    }

    // 2) هش پسورد
    const hash = await bcrypt.hash(data.password, 10);

    // 3) اگر نقش client و clientId ندارد → Client بساز
    let clientId = data.clientId ?? null;
    if (data.role === 'client' && !clientId) {
      const createdClient = await Client.create({
        name: (data.name ?? email.split('@')[0]) || email.split('@')[0],
        email,
      });
      clientId = createdClient._id; // ObjectId ذخیره می‌شود
    }

    // 4) ساخت کاربر
    const user = await User.create({
      email,
      password: hash,
      role: data.role || 'client',
      name: data.name ?? null,
      modelId: data.modelId ?? null,
      clientId: clientId ?? null,
    });

    // 5) ساخت توکن
    const token = signToken(user);

    // 6) ست‌کردن کوکی HttpOnly (مثل login)
    const isProd = process.env.NODE_ENV === 'production';
    // Use SameSite=lax in development so browsers accept the cookie over HTTP.
    // For production with HTTPS you might use SameSite=None and secure:true when cross-site cookies are required.
    const cookieOpts = {
      httpOnly: true,
      secure: isProd, // only secure in production
      sameSite: isProd ? 'lax' : 'lax',
      path: '/',
    };
    res.cookie('access_token', token, cookieOpts);
    // Debug
    // eslint-disable-next-line no-console
    console.log('[AUTH] set cookie access_token, opts=', cookieOpts);

    // 7) خروجی
    // For E2E tests we include the token in the response body in non-production
    // so tests that call the API directly can extract tokens. In production this
    // is omitted for security.
    const resp = { ok: true, data: { user: safeUser(user) } };
    if (process.env.NODE_ENV !== 'production') resp.data.token = token;
    return res.status(201).json(resp);
  } catch (err) {
    console.error('register error:', err);
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

    // نکتهٔ مهم: اگر در اسکیمای User فیلد password با select:false تعریف شده،
    // باید اینجا صراحتاً آن را انتخاب کنیم:
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ ok: false, message: 'ایمیل یا گذرواژه نادرست است' });
    }

    // اگر به هر دلیل پسورد در دسترس نبود (بدون اینکه 500 بدهیم) → 401
    if (!user.password || typeof user.password !== 'string') {
      return res.status(401).json({ ok: false, message: 'ایمیل یا گذرواژه نادرست است' });
    }

    let ok = false;
    try {
      ok = await bcrypt.compare(data.password, user.password);
    } catch {
      // در صورت خطای داخلی bcrypt هم پاسخ امن برگردانیم (نه 500)
      return res.status(401).json({ ok: false, message: 'ایمیل یا گذرواژه نادرست است' });
    }
    if (!ok) {
      return res.status(401).json({ ok: false, message: 'ایمیل یا گذرواژه نادرست است' });
    }

    // Self-heal: اگر client است و clientId ندارد → بساز و وصل کن
    if (user.role === 'client' && !user.clientId) {
      const client = await Client.create({
        name: user.name || user.email.split('@')[0],
        email: user.email,
      });
      user.clientId = client._id;
      await user.save();
    }

    const token = signToken(user);

    // ست‌کردن کوکی HttpOnly
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOpts2 = { httpOnly: true, secure: isProd, sameSite: isProd ? 'lax' : 'lax', path: '/' };
    res.cookie('access_token', token, cookieOpts2);
    // eslint-disable-next-line no-console
    console.log('[AUTH] login set cookie access_token, opts=', cookieOpts2);

      const resp2 = { ok: true, data: { user: safeUser(user) } };
      if (process.env.NODE_ENV !== 'production') resp2.data.token = token;
      return res.json(resp2);
  } catch (err) {
    console.error('login error:', err);
    if (err?.issues?.length) {
      return res.status(400).json({ ok: false, message: err.issues[0]?.message || 'Invalid input' });
    }
    return res.status(500).json({ ok: false, message: 'لاگین ناموفق بود' });
  }
};

export const logout = async (_req, res) => {
  try {
    res.clearCookie('access_token', { path: '/' });
    res.cookie('access_token', '', {
      httpOnly: true,
      path: '/',
      expires: new Date(0),
      maxAge: 0,
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
    });
    return res.json({ ok: true, msg: 'Logged out' });
  } catch (e) {
    console.error('logout error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

export const me = async (req, res) => {
  try {
    const u = req.user;
    if (!u) return res.status(401).json({ ok: false, message: 'توکن لازم است' });
    return res.json({ ok: true, data: { user: safeUser(u) } });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};
