// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

/** 🟢 گرفتن توکن از هدر Authorization (Bearer ...) */
function getTokenFromHeader(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (!h) return null;
  const [scheme, token] = String(h).split(' ');
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token.trim();
}

/** 🟢 گرفتن توکن از کوکی HttpOnly */
function getTokenFromCookie(req) {
  return req.cookies?.access_token || null;
}

/** 🟢 انتخاب توکن: اول هدر → اگر نبود کوکی */
function getToken(req) {
  return getTokenFromHeader(req) || getTokenFromCookie(req);
}

/** 🟢 داده‌ای که از کاربر برمی‌گردونیم */
function mapUser(u) {
  if (!u) return null;
  return {
    _id: u._id,
    id: u._id?.toString?.() ?? u.id,
    role: u.role,
    email: u.email,
    name: u.name ?? null,
    modelId: u.modelId ?? null,
    clientId: u.clientId ?? null,
  };
}

/** 🟢 احراز هویت اختیاری: اگر توکن نبود → رد می‌کنیم */
export async function optionalAuth(req, _res, next) {
  try {
    const token = getToken(req);
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload?.userId || payload?.id || payload?._id || payload?.sub;
    if (!userId) return next();
    const u = await User.findById(userId).lean();
    if (u) req.user = mapUser(u);
  } catch {
    // هیچ خطا نشون داده نمی‌شه، فقط رد می‌کنه
  }
  next();
}

/** 🟢 احراز هویت اجباری */
export async function authRequired(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ ok: false, message: 'توکن لازم است' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload?.userId || payload?.id || payload?._id || payload?.sub;
    const u = userId ? await User.findById(userId).lean() : null;
    if (!u) return res.status(401).json({ ok: false, message: 'کاربر معتبر نیست' });
    req.user = mapUser(u);
    next();
  } catch {
    return res.status(401).json({ ok: false, message: 'توکن نامعتبر است' });
  }
}

/** 🟢 محدود کردن دسترسی به نقش‌های خاص */
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: 'احراز هویت نشده' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: 'اجازه دسترسی ندارید' });
    }
    next();
  };
}
