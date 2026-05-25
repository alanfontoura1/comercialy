const pool = require('../config/database');

async function list(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT id, phone, name, email, tags, created_at FROM contacts WHERE tenant_id = $1`;
    const params = [tenantId];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    res.json({ data: rows, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

async function upsert(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { phone, name, email, tags = [] } = req.body;

    if (!phone) return res.status(400).json({ error: 'phone é obrigatório' });

    const { rows: [contact] } = await pool.query(
      `INSERT INTO contacts (tenant_id, phone, name, email, tags)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, phone)
       DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, tags = EXCLUDED.tags
       RETURNING *`,
      [tenantId, phone, name, email, tags]
    );

    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, upsert };
