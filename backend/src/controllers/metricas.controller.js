const pool = require('../config/database');

async function getResumo(req, res, next) {
  try {
    const { clinica_id, periodo = 30 } = req.query;
    if (!clinica_id) return res.status(400).json({ error: 'clinica_id e obrigatorio' });

    const dias = parseInt(periodo);

    const [totalResult, novosResult, agendamentosResult, statusResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM leads WHERE clinica_id = $1`, [clinica_id]),
      pool.query(
        `SELECT COUNT(*) as total FROM leads WHERE clinica_id = $1 AND created_at >= NOW() - INTERVAL '${dias} days'`,
        [clinica_id]
      ),
      pool.query(
        `SELECT COUNT(*) as total FROM agendamentos WHERE clinica_id = $1 AND created_at >= NOW() - INTERVAL '${dias} days'`,
        [clinica_id]
      ),
      pool.query(
        `SELECT status, COUNT(*) as count FROM leads WHERE clinica_id = $1 GROUP BY status`,
        [clinica_id]
      ),
    ]);

    const total_leads = parseInt(totalResult.rows[0].total);
    const leads_novos = parseInt(novosResult.rows[0].total);
    const agendamentos_periodo = parseInt(agendamentosResult.rows[0].total);

    const leads_por_status = {};
    statusResult.rows.forEach(r => { leads_por_status[r.status] = parseInt(r.count); });

    const convertidos = leads_por_status['convertido'] || 0;
    const taxa_conversao = total_leads > 0 ? ((convertidos / total_leads) * 100).toFixed(2) : 0;

    res.json({
      total_leads,
      leads_novos,
      agendamentos_periodo,
      taxa_conversao: parseFloat(taxa_conversao),
      leads_por_status,
    });
  } catch (err) { next(err); }
}

async function getAtividade(req, res, next) {
  try {
    const { clinica_id, periodo = 30 } = req.query;
    if (!clinica_id) return res.status(400).json({ error: 'clinica_id e obrigatorio' });

    const dias = parseInt(periodo);

    const { rows } = await pool.query(
      `SELECT DATE(created_at) as dia, COUNT(*) as total
       FROM leads
       WHERE clinica_id = $1 AND created_at >= NOW() - INTERVAL '${dias} days'
       GROUP BY dia
       ORDER BY dia`,
      [clinica_id]
    );

    res.json({ data: rows, periodo: dias });
  } catch (err) { next(err); }
}

async function getFunil(req, res, next) {
  try {
    const { clinica_id } = req.query;
    if (!clinica_id) return res.status(400).json({ error: 'clinica_id e obrigatorio' });

    const statusOrder = ['novo', 'qualificacao', 'qualificado', 'agendado', 'convertido'];

    const { rows } = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM leads
       WHERE clinica_id = $1 AND status = ANY($2)
       GROUP BY status`,
      [clinica_id, statusOrder]
    );

    const funil = statusOrder.map(s => {
      const found = rows.find(r => r.status === s);
      return { status: s, count: found ? parseInt(found.count) : 0 };
    });

    res.json({ data: funil });
  } catch (err) { next(err); }
}

module.exports = { getResumo, getAtividade, getFunil };
