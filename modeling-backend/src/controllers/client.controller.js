// حافظه موقت تا وقتی دیتابیس وصل بشه
const _clients = [];

export const registerClient = (req, res) => {
  const { name, company, city, phone, email, instagram } = req.body || {};

  if (!name) return res.status(400).json({ ok: false, message: 'name الزامی است' });

  const client = {
    id: _clients.length + 1,
    name,
    company: company ?? null,
    city: city ?? null,
    phone: phone ?? null,
    email: email ?? null,
    instagram: instagram ?? null,
    createdAt: new Date().toISOString(),
  };

  _clients.push(client);
  return res.status(201).json({ ok: true, data: client });
};

export const listClients = (req, res) => {
  return res.json({ ok: true, count: _clients.length, data: _clients });
};
