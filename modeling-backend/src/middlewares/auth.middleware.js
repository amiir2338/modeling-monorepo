// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

function getTokenFromHeader(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (!h) return null;
  const parts = h.split(' ');
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
}

/** نیازمند توکن معتبر (برای مسیرهای محافظت‌شده) */
export async function authRequired(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ ok: false, message: 'توکن ارسال نشده' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // کاربر را از DB بخوانیم تا آخرین وضعیت/نقش را داشته باشیم
    const user = await User.findById(decoded.sub).lean();
    if (!user || user.isActive === false) {
      return res.status(401).json({ ok: false, message: 'دسترسی نامعتبر یا کاربر غیرفعال' });
    }

    // ضمیمه به req برای کنترلرها
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      modelId: user.modelId ?? null,
      clientId: user.clientId ? user.clientId.toString() : (decoded.clientId ?? null),
    };

    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'توکن نامعتبر یا منقضی شده' });
  }
}

/**
 * احراز هویت اختیاری:
 * اگر توکن معتبر بود، req.user را ست می‌کند؛
 * اگر نبود/ارسال نشد، بدون خطا عبور می‌کند (برای مسیرهای عمومی + قابلیت تشخیص مالک/ادمین).
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).lean();

    if (user && user.isActive !== false) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        modelId: user.modelId ?? null,
        clientId: user.clientId ? user.clientId.toString() : (decoded.clientId ?? null),
      };
    }

    return next();
  } catch {
    // اگر توکن بد بود، مسیر عمومی را خراب نکن
    return next();
  }
}

/** محدودسازی بر اساس نقش‌ها (مثلاً فقط client یا admin) */
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'احراز هویت نشده' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: 'اجازه دسترسی ندارید' });
    }
    next();
  };
}
