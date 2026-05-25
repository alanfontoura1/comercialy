const pool = require('../config/database');

const ALL_STATUSES = ['novo', 'qualificacao', 'qualificado', 'agendado', 'convertido', 'followup', 'nutricao', 'arquivado'];

async function getBoard(req, res, next) {
  try {
    const { clinica_id } = req.query;
    if (!clinica_id) return res.status(400).json({ error: 'clinica_id e obrigatorio' });

    const { rows } = await pool.query(
      `SELECT status, json_agg(
        json_build_object(
          'id', id,
          'nome', nome,
          'telefone', telefone,
          'score', score,
          'procedimento_interesse', procedimento_interesse,
          'data_contato', data_contato,
          'bloqueado', bloqueado
        ) ORDER BY updated_at DESC
      ) AS leads
      FROM leads
      WHERE clinica_id = $1
      GROUP BY status`,
      [clinica_id]
    );

    // Reshape to object with all 8 statuses
    const board = {};
    ALL_STATUSES.forEach(s => { board[s] = []; });
    rows.forEach(row => {
      board[row.status] = row.leads || [];
    });

    res.json(board);
  } catch (err) { next(err); }
}

async function moverCard(req, res, next) {
  try {
    const { leadId } = req.params;
    const { status, clinica_id } = req.body;

    if (!status || !ALL_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status invalido' });
    }
    if (!clinica_id) return res.status(400).json({ error: 'clinica_id e obrigatorio' });

    const { rows: [lead] } = await pool.query(
      `UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2 AND clinica_id = $3 RETURNING *`,
      [status, leadId, clinica_id]
    );

    if (!lead) return res.status(404).json({ error: 'Lead nao encontrado' });

    if (status === 'agendado' && req.app.locals.broadcast) {
      req.app.locals.broadcast({ event: 'kanban:moved', data: { leadId, status } });
    }

    res.json(lead);
  } catch (err) { next(err); }
}

module.exports = { getBoard, moverCard };
