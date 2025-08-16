// src/utils/makeCrud.js
import { Router } from 'express';

/** توابع CRUD جنریک برای هر مدل Mongoose */
export function makeCrudController(Model) {
  return {
    // POST /
    createOne: async (req, res) => {
      try {
        const doc = await Model.create(req.body || {});
        return res.status(201).json({ ok: true, data: doc });
      } catch (err) {
        console.error('createOne error:', err);
        return res.status(400).json({ ok: false, message: err.message || 'ایجاد ناموفق بود' });
      }
    },

    // GET /  → لیست با فیلتر ساده + صفحه‌بندی
    getMany: async (req, res) => {
      try {
        const { page = 1, limit = 10, q, ...rest } = req.query;
        const find = { ...rest };

        // جستجوی متنی ساده اگر ایندکس text داشته باشی
        if (q) find.$text = { $search: q };

        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
          Model.find(find).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
          Model.countDocuments(find),
        ]);

        return res.json({ ok: true, total, page: Number(page), limit: Number(limit), data: items });
      } catch (err) {
        console.error('getMany error:', err);
        return res.status(500).json({ ok: false, message: 'دریافت لیست ناموفق بود' });
      }
    },

    // GET /:id
    getOne: async (req, res) => {
      try {
        const { id } = req.params;
        const doc = await Model.findById(id);
        if (!doc) return res.status(404).json({ ok: false, message: 'مورد پیدا نشد' });
        return res.json({ ok: true, data: doc });
      } catch (err) {
        console.error('getOne error:', err);
        return res.status(500).json({ ok: false, message: 'دریافت مورد ناموفق بود' });
      }
    },

    // PATCH /:id
    updateOne: async (req, res) => {
      try {
        const { id } = req.params;
        const doc = await Model.findByIdAndUpdate(id, req.body || {}, { new: true, runValidators: true });
        if (!doc) return res.status(404).json({ ok: false, message: 'مورد پیدا نشد' });
        return res.json({ ok: true, data: doc });
      } catch (err) {
        console.error('updateOne error:', err);
        return res.status(400).json({ ok: false, message: err.message || 'اپدیت ناموفق بود' });
      }
    },

    // DELETE /:id
    removeOne: async (req, res) => {
      try {
        const { id } = req.params;
        const doc = await Model.findByIdAndDelete(id);
        if (!doc) return res.status(404).json({ ok: false, message: 'مورد پیدا نشد' });
        return res.json({ ok: true, data: { _id: id, removed: true } });
      } catch (err) {
        console.error('removeOne error:', err);
        return res.status(500).json({ ok: false, message: 'حذف ناموفق بود' });
      }
    },
  };
}

/** ساخت Router جنریک از روی کنترلر */
export function makeCrudRouter(Model) {
  const r = Router();
  const c = makeCrudController(Model);

  r.get('/', c.getMany);
  r.post('/', c.createOne);
  r.get('/:id', c.getOne);
  r.patch('/:id', c.updateOne);
  r.delete('/:id', c.removeOne);

  return r;
}
