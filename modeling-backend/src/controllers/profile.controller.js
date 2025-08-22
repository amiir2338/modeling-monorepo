// src/controllers/profile.controller.js
import { ModelProfile } from '../models/modelProfile.model.js';
import { ClientProfile } from '../models/clientProfile.model.js';

/* --------------------------- helpers --------------------------- */
function sanitizeString(s, max=1000) {
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  return t.slice(0, max);
}
function sanitizeUrl(u) {
  if (typeof u !== 'string') return undefined;
  return u.trim();
}
function sanitizeNumber(n) {
  if (n === undefined || n === null || n === '') return undefined;
  const v = Number(n);
  if (Number.isNaN(v)) return undefined;
  return v;
}
function sanitizeStringArray(arr, maxItems=20) {
  if (!Array.isArray(arr)) return undefined;
  return arr.slice(0, maxItems).map(x => String(x).trim()).filter(Boolean);
}

/* --------------------------- Model Profile --------------------------- */
export const getMyModelProfile = async (req, res) => {
  try {
    if (req.user.role !== 'model') return res.status(403).json({ ok: false, message: 'Forbidden' });
    const doc = await ModelProfile.findOne({ userId: req.user._id });
    return res.json({ ok: true, data: doc || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

export const updateMyModelProfile = async (req, res) => {
  try {
    if (req.user.role !== 'model') return res.status(403).json({ ok: false, message: 'Forbidden' });

    const update = {
      bio: sanitizeString(req.body.bio, 1000),
      height: sanitizeNumber(req.body.height),
      weight: sanitizeNumber(req.body.weight),
      city: sanitizeString(req.body.city, 100),
      skills: sanitizeStringArray(req.body.skills),
      socialLinks: {
        instagram: sanitizeUrl(req.body?.socialLinks?.instagram),
        tiktok: sanitizeUrl(req.body?.socialLinks?.tiktok),
        website: sanitizeUrl(req.body?.socialLinks?.website),
      },
      avatarUrl: sanitizeUrl(req.body.avatarUrl),
    };

    Object.keys(update).forEach(k => (update[k] === undefined) && delete update[k]);

    const doc = await ModelProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update, $setOnInsert: { userId: req.user._id } },
      { new: true, upsert: true }
    );
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

export const getModelProfilePublic = async (req, res) => {
  try {
    const { userId } = req.params;
    const doc = await ModelProfile.findOne({ userId }).populate('userId', 'name email role');
    if (!doc) return res.status(404).json({ ok: false, message: 'Profile not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

export const listModels = async (req, res) => {
  try {
    const { city, q, skill, page=1, limit=20 } = req.query;
    const filter = {};
    if (city) filter.city = city;
    if (skill) filter.skills = skill;
    if (q) filter.$text = { $search: String(q) };

    const skip = (Number(page)-1) * Number(limit);
    const [items, total] = await Promise.all([
      ModelProfile.find(filter).populate('userId', 'name email role')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ModelProfile.countDocuments(filter)
    ]);
    return res.json({ ok: true, data: items, page: Number(page), total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

/* --------------------------- Client Profile --------------------------- */
export const getMyClientProfile = async (req, res) => {
  try {
    if (req.user.role !== 'client') return res.status(403).json({ ok: false, message: 'Forbidden' });
    const doc = await ClientProfile.findOne({ userId: req.user._id });
    return res.json({ ok: true, data: doc || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

export const updateMyClientProfile = async (req, res) => {
  try {
    if (req.user.role !== 'client') return res.status(403).json({ ok: false, message: 'Forbidden' });

    const update = {
      companyName: sanitizeString(req.body.companyName, 200),
      website: sanitizeUrl(req.body.website),
      bio: sanitizeString(req.body.bio, 1000),
      logoUrl: sanitizeUrl(req.body.logoUrl),
      city: sanitizeString(req.body.city, 100),
    };
    Object.keys(update).forEach(k => (update[k] === undefined) && delete update[k]);

    const doc = await ClientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update, $setOnInsert: { userId: req.user._id } },
      { new: true, upsert: true }
    );
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

export const getClientProfilePublic = async (req, res) => {
  try {
    const { userId } = req.params;
    const doc = await ClientProfile.findOne({ userId }).populate('userId', 'name email role');
    if (!doc) return res.status(404).json({ ok: false, message: 'Profile not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};

export const listClients = async (req, res) => {
  try {
    const { city, q, page=1, limit=20 } = req.query;
    const filter = {};
    if (city) filter.city = city;
    if (q) filter.$text = { $search: String(q) };

    const skip = (Number(page)-1) * Number(limit);
    const [items, total] = await Promise.all([
      ClientProfile.find(filter).populate('userId', 'name email role')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ClientProfile.countDocuments(filter)
    ]);
    return res.json({ ok: true, data: items, page: Number(page), total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};
