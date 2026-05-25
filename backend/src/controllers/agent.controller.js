const pool = require('../config/database');

async function list(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, model, temperature, active, created_at
       FROM ai_agents WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [req.user.tenantId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { name, system_prompt, model = 'gemini-2.0-flash', temperature = 0.7 } = req.body;
    if (!name || !system_prompt) return res.status(400).json({ error: 'name e system_prompt são obrigatórios' });

    const { rows: [agent] } = await pool.query(
      `INSERT INTO ai_agents (tenant_id, name, system_prompt, model, temperature)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.tenantId, name, system_prompt, model, temperature]
    );
    res.status(201).json(agent);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, system_prompt, model, temperature, active } = req.body;

    const { rows: [agent] } = await pool.query(
      `UPDATE ai_agents
       SET name = COALESCE($1, name),
           system_prompt = COALESCE($2, system_prompt),
           model = COALESCE($3, model),
           temperature = COALESCE($4, temperature),
           active = COALESCE($5, active)
       WHERE id = $6 AND tenant_id = $7
       RETURNING *`,
      [name, system_prompt, model, temperature, active, id, req.user.tenantId]
    );

    if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });
    res.json(agent);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM ai_agents WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Agente não encontrado' });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
