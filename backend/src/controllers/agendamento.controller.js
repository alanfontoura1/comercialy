const pool = require('../config/database');
const { sendGroupMessage } = require('../services/baileys.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTimeSlots(inicio, fim, duracaoMin = 60) {
  const slots = [];
  const [sh, sm] = inicio.split(':').map(Number);
  const [eh, em] = fim.split(':').map(Number);
  let cur = sh * 60 + sm;
  const end = eh * 60 + em;
  while (cur + duracaoMin <= end) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0');
    const m = String(cur % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    cur += duracaoMin;
  }
  return slots;
}

function dayOfWeek(dateStr) {
  // dateStr: 'YYYY-MM-DD'
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay(); // 0=dom, 6=sab
}

async function notifyGroup(clinicaId, msg) {
  try {
    await sendGroupMessage(clinicaId, msg);
  } catch (_) {}
}

// ─── Controllers ──────────────────────────────────────────────────────────────

async function list(req, res, next) {
  try {
    const { clinica_id, data_inicio, data_fim, status } = req.query;
    const conditions = [];
    const params = [];

    if (clinica_id) { params.push(clinica_id); conditions.push(`a.clinica_id = $${params.length}`); }
    if (data_inicio) { params.push(data_inicio); conditions.push(`a.data >= $${params.length}`); }
    if (data_fim)    { params.push(data_fim);    conditions.push(`a.data <= $${params.length}`); }
    if (status)      { params.push(status);      conditions.push(`a.status = $${params.length}`); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT a.*,
         COALESCE(l.nome, a.nome_paciente) as nome_display,
         l.telefone, l.nome as lead_nome,
         p.nome as procedimento_nome, p.duracao_minutos as proc_duracao
       FROM agendamentos a
       LEFT JOIN leads l ON l.id = a.lead_id
       LEFT JOIN procedimentos p ON p.id = a.procedimento_id
       ${where}
       ORDER BY a.data ASC, a.horario ASC`,
      params
    );

    res.json({ data: rows });
  } catch (err) { next(err); }
}

async function getSlots(req, res, next) {
  try {
    const { clinica_id, data } = req.query;
    if (!clinica_id || !data) return res.status(400).json({ error: 'clinica_id e data obrigatorios' });

    const { rows: [clinica] } = await pool.query(
      `SELECT horario_inicio, horario_fim, funciona_domingo, atendente_24h FROM clinicas WHERE id = $1`, [clinica_id]
    );
    if (!clinica) return res.status(404).json({ error: 'Clinica nao encontrada' });

    const dow = dayOfWeek(data);
    if (dow === 0 && !clinica.funciona_domingo) {
      return res.json({ data, slots: [], motivo: 'Domingo — clínica fechada' });
    }

    const inicio = String(clinica.horario_inicio || '08:00').slice(0, 5);
    const fim    = String(clinica.horario_fim    || '18:00').slice(0, 5);
    const todos  = generateTimeSlots(inicio, fim, 60);

    // Occupied slots for this date
    const { rows: ocupados } = await pool.query(
      `SELECT to_char(horario, 'HH24:MI') as horario
       FROM agendamentos
       WHERE clinica_id = $1 AND data = $2 AND status != 'cancelado'`,
      [clinica_id, data]
    );
    const ocupadosSet = new Set(ocupados.map(r => r.horario));
    const livres = todos.filter(s => !ocupadosSet.has(s));

    res.json({ data, slots: livres, ocupados: [...ocupadosSet] });
  } catch (err) { next(err); }
}

async function getSlotsWeek(req, res, next) {
  try {
    const { clinica_id, data_inicio } = req.query;
    if (!clinica_id || !data_inicio) return res.status(400).json({ error: 'clinica_id e data_inicio obrigatorios' });

    const { rows: [clinica] } = await pool.query(
      `SELECT horario_inicio, horario_fim, funciona_domingo FROM clinicas WHERE id = $1`, [clinica_id]
    );
    if (!clinica) return res.status(404).json({ error: 'Clinica nao encontrada' });

    const inicio = String(clinica.horario_inicio || '08:00').slice(0, 5);
    const fim    = String(clinica.horario_fim    || '18:00').slice(0, 5);

    const result = {};
    const base = new Date(data_inicio + 'T12:00:00');
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dow = d.getDay();
      if (dow === 0 && !clinica.funciona_domingo) {
        result[dateStr] = [];
        continue;
      }
      const todos = generateTimeSlots(inicio, fim, 60);
      const { rows: ocupados } = await pool.query(
        `SELECT to_char(horario, 'HH24:MI') as h FROM agendamentos
         WHERE clinica_id = $1 AND data = $2 AND status != 'cancelado'`,
        [clinica_id, dateStr]
      );
      const ocupadosSet = new Set(ocupados.map(r => r.h));
      result[dateStr] = todos.filter(s => !ocupadosSet.has(s));
    }

    res.json({ slots: result });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { lead_id, clinica_id, procedimento_id, data, horario, duracao_minutos, observacoes, nome_paciente, tipo } = req.body;

    if (!clinica_id || !data || !horario) {
      return res.status(400).json({ error: 'clinica_id, data e horario sao obrigatorios' });
    }

    const { rows: [agendamento] } = await pool.query(
      `INSERT INTO agendamentos (lead_id, clinica_id, procedimento_id, data, horario, duracao_minutos, observacoes, nome_paciente, tipo, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'agendado')
       RETURNING *`,
      [lead_id || null, clinica_id, procedimento_id || null, data, horario, duracao_minutos || 60, observacoes || null, nome_paciente || null, tipo || 'normal']
    );

    const { rows: [enriched] } = await pool.query(
      `SELECT a.*,
         COALESCE(l.nome, a.nome_paciente) as nome_display,
         l.telefone, p.nome as procedimento_nome
       FROM agendamentos a
       LEFT JOIN leads l ON l.id = a.lead_id
       LEFT JOIN procedimentos p ON p.id = a.procedimento_id
       WHERE a.id = $1`,
      [agendamento.id]
    );

    // Update lead status
    if (lead_id) {
      await pool.query(
        `UPDATE leads SET status = 'agendado', data_agendamento = $1, horario_agendamento = $2, updated_at = NOW() WHERE id = $3`,
        [data, horario, lead_id]
      );
    }

    // Notify group
    const dataFmt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    const proc    = enriched.procedimento_nome || null;
    const nome    = enriched.nome_display || enriched.telefone || 'Paciente';
    const tipoLabel = tipo === 'encaixe' ? '⚡ ENCAIXE' : '📅 AGENDAMENTO';

    await notifyGroup(clinica_id,
      `${tipoLabel}\n\nPaciente: ${nome}${proc ? `\nProcedimento: ${proc}` : ''}\nData: ${dataFmt} às ${horario}${observacoes ? `\nObs: ${observacoes}` : ''}`
    );

    if (req.app?.locals?.broadcast) {
      req.app.locals.broadcast({ event: 'agendamento:created', data: enriched });
    }

    res.status(201).json(enriched);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields).filter(k => !['id', 'created_at'].includes(k));
    if (keys.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
    const values = keys.map(k => fields[k]);

    const { rows: [agendamento] } = await pool.query(
      `UPDATE agendamentos SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    if (!agendamento) return res.status(404).json({ error: 'Agendamento nao encontrado' });

    // If rescheduled, update lead + notify
    if (fields.data || fields.horario) {
      const { rows: [enriched] } = await pool.query(
        `SELECT a.*, COALESCE(l.nome, a.nome_paciente) as nome_display, l.telefone, p.nome as procedimento_nome
         FROM agendamentos a LEFT JOIN leads l ON l.id = a.lead_id LEFT JOIN procedimentos p ON p.id = a.procedimento_id
         WHERE a.id = $1`, [id]
      );
      if (enriched?.lead_id) {
        await pool.query(
          `UPDATE leads SET data_agendamento = $1, horario_agendamento = $2, updated_at = NOW() WHERE id = $3`,
          [agendamento.data, agendamento.horario, enriched.lead_id]
        );
      }
      const dataFmt = new Date(agendamento.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
      await notifyGroup(agendamento.clinica_id,
        `🔄 REMARCAÇÃO\n\nPaciente: ${enriched?.nome_display || 'Paciente'}\nNova data: ${dataFmt} às ${agendamento.horario}\n${enriched?.procedimento_nome ? `Procedimento: ${enriched.procedimento_nome}` : ''}`
      );
    }

    res.json(agendamento);
  } catch (err) { next(err); }
}

async function cancelar(req, res, next) {
  try {
    const { id } = req.params;
    const { motivo } = req.body || {};

    const { rows: [enriched] } = await pool.query(
      `SELECT a.*, COALESCE(l.nome, a.nome_paciente) as nome_display, l.telefone, p.nome as procedimento_nome
       FROM agendamentos a LEFT JOIN leads l ON l.id = a.lead_id LEFT JOIN procedimentos p ON p.id = a.procedimento_id
       WHERE a.id = $1`, [id]
    );
    if (!enriched) return res.status(404).json({ error: 'Agendamento nao encontrado' });

    await pool.query(`UPDATE agendamentos SET status = 'cancelado', updated_at = NOW() WHERE id = $1`, [id]);

    if (enriched.lead_id) {
      await pool.query(
        `UPDATE leads SET status = 'qualificado', updated_at = NOW() WHERE id = $1 AND status = 'agendado'`,
        [enriched.lead_id]
      );
    }

    const dataFmt = new Date(enriched.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    await notifyGroup(enriched.clinica_id,
      `❌ CANCELAMENTO\n\nPaciente: ${enriched.nome_display || 'Paciente'}\nData: ${dataFmt} às ${enriched.horario}\n${motivo ? `Motivo: ${motivo}` : ''}`
    );

    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { list, getSlots, getSlotsWeek, create, update, cancelar };
