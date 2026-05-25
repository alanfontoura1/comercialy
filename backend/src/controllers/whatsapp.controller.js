const pool = require('../config/database');
const evolution = require('../services/evolution.service');

async function list(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, instance_name, phone_number, status, created_at
       FROM whatsapp_instances WHERE tenant_id = $1`,
      [req.user.tenantId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { instanceName } = req.body;
    if (!instanceName) return res.status(400).json({ error: 'instanceName é obrigatório' });

    const evData = await evolution.createInstance(instanceName);

    const { rows: [inst] } = await pool.query(
      `INSERT INTO whatsapp_instances (tenant_id, instance_name, evolution_data)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.tenantId, instanceName, evData]
    );

    res.status(201).json(inst);
  } catch (err) { next(err); }
}

async function getQRCode(req, res, next) {
  try {
    const { rows: [inst] } = await pool.query(
      `SELECT instance_name FROM whatsapp_instances WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );
    if (!inst) return res.status(404).json({ error: 'Instância não encontrada' });

    const data = await evolution.getQRCode(inst.instance_name);
    res.json(data);
  } catch (err) { next(err); }
}

async function getStatus(req, res, next) {
  try {
    const { rows: [inst] } = await pool.query(
      `SELECT instance_name FROM whatsapp_instances WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );
    if (!inst) return res.status(404).json({ error: 'Instância não encontrada' });

    const data = await evolution.getInstanceStatus(inst.instance_name);

    await pool.query(
      `UPDATE whatsapp_instances SET status = $1 WHERE id = $2`,
      [data.instance?.state || 'unknown', req.params.id]
    );

    res.json(data);
  } catch (err) { next(err); }
}

module.exports = { list, create, getQRCode, getStatus };
