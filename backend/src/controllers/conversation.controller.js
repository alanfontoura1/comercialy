const pool = require('../config/database');

async function list(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { status, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    const params = [tenantId];
    let where = 'c.tenant_id = $1';

    if (status) {
      params.push(status);
      where += ` AND c.status = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT c.id, c.status, c.ai_enabled, c.created_at,
              ct.name AS contact_name, ct.phone AS contact_phone,
              (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
       FROM conversations c
       JOIN contacts ct ON ct.id = c.contact_id
       WHERE ${where}
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ data: rows, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

async function getMessages(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const conv = await pool.query(
      `SELECT c.id FROM conversations c WHERE c.id = $1 AND c.tenant_id = $2`,
      [id, tenantId]
    );
    if (conv.rows.length === 0) return res.status(404).json({ error: 'Conversa não encontrada' });

    const { rows } = await pool.query(
      `SELECT id, role, content, media_url, media_type, created_at
       FROM messages WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function toggleAI(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const { rows: [conv] } = await pool.query(
      `UPDATE conversations SET ai_enabled = NOT ai_enabled
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, ai_enabled`,
      [id, tenantId]
    );

    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });
    res.json(conv);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getMessages, toggleAI };
