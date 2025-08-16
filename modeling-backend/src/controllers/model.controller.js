import Model from '../models/model.model.js';

// POST /api/v1/models → ثبت مدل جدید (MongoDB)
export const registerModel = async (req, res) => {
  try {
    const { name, height, size, city, instagram, bio, skills, photos } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, message: 'name الزامی است' });

    const created = await Model.create({
      name,
      height: height ?? null,
      size: size ?? null,
      city: city ?? null,
      instagram: instagram ?? null,
      bio: bio ?? null,
      skills: Array.isArray(skills) ? skills : [],
      photos: Array.isArray(photos) ? photos : [],
    });

    return res.status(201).json({ ok: true, data: created });
  } catch (err) {
    console.error('registerModel error:', err);
    return res.status(500).json({ ok: false, message: 'ثبت مدل ناموفق بود' });
  }
};

// GET /api/v1/models → لیست مدل‌ها (با امکان فیلتر ساده و صفحه‌بندی)
export const listModels = async (req, res) => {
  try {
    const { q, city, page = 1, limit = 10 } = req.query;
    const find = {};
    if (city) find.city = city;

    // جستجو ساده روی name/city با ایندکس متنی
    if (q) {
      find.$text = { $search: q };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Model.find(find).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Model.countDocuments(find),
    ]);

    return res.json({
      ok: true,
      total,
      page: Number(page),
      limit: Number(limit),
      data: items,
    });
  } catch (err) {
    console.error('listModels error:', err);
    return res.status(500).json({ ok: false, message: 'دریافت لیست مدل‌ها ناموفق بود' });
  }
};

// GET /api/v1/models/:id → دریافت جزئیات مدل با شناسه
export const getModelById = async (req, res) => {
  try {
    const { id } = req.params;

    // پشتیبانی از هر دو حالت: ObjectId و عددی/قدیمی
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { _id: id }; // الان فقط ObjectId منطقیه

    const item = await Model.findOne(query);
    if (!item) return res.status(404).json({ ok: false, message: 'مدل پیدا نشد' });

    return res.json({ ok: true, data: item });
  } catch (err) {
    console.error('getModelById error:', err);
    return res.status(500).json({ ok: false, message: 'دریافت مدل ناموفق بود' });
  }
};
