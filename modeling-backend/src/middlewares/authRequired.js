import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
  try {
    const token = req.cookies?.access_token;  // ⬅️ از کوکی بخون
    if (!token) {
      return res.status(401).json({ ok: false, message: 'توکن لازم است' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: 'توکن نامعتبر است' });
  }
}
