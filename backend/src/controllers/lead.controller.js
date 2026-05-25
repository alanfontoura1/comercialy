const pool = require('../config/database');
const { calcular } = require('../services/leadScore.service');
const { createCalendarEvent } = require('../services/google.calendar.service');
const { sendGroupMessage } = require('../services/baileys.service');

async function sendAgendamentoNotification(lead) {
  const pago = lead.cobra_consulta ? '✅' : '➖';
  const data = lead.data_agendamento
    ? new Date(lead.data_agendamento + 'T12:00:00').toLocaleDateString('pt-BR')
    : '—';
  const horario = lead.horario_agendamento || '—';
  const msg = `📅 *NOVO AGENDAMENTO*\n\nPaciente: ${lead.nome || lead.telefone} | Procedimento: ${lead.procedimento_interesse || '—'}\nData: ${data} às ${horario} | Score: ${lead.score ?? 0}\nConsulta paga: ${pago}`;
  await sendGroupMessage(lead.clinica_id, msg);
}

async function tryCreateCalendarEvent(lead) {
  if (!lead?.data_agendamento || !lead?.clinica_id) return;
  try {
    await createCalendarEvent({
      clinicaId: lead.clinica_id,
      nome: lead.nome || lead.telefone,
      procedimento: lead.procedimento_interesse,
      data: lead.data_agendamento,
      horario: lead.horario_agendamento,
    });
  } catch (err) {
    console.warn('[Calendar] Falha ao criar evento:', err.message);
  }
}

async function list(req, res, next) {
  try {
    const { clinica_id, status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (clinica_id) {
      params.push(clinica_id);
      conditions.push(`clinica_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(nome ILIKE $${params.length} OR telefone ILIKE $${params.length})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(parseInt(limit));
    params.push(offset);

    const { rows } = await pool.query(
      `SELECT * FROM leads ${where} ORDER BY updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) as count FROM leads ${where}`,
      countParams
    );

    res.json({ data: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const { rows: [lead] } = await pool.query(`SELECT * FROM leads WHERE id = $1`, [id]);
    if (!lead) return res.status(404).json({ error: 'Lead nao encontrado' });

    const { rows: mensagens } = await pool.query(
      `SELECT * FROM mensagens WHERE lead_id = $1 ORDER BY created_at ASC LIMIT 50`,
      [id]
    );

    res.json({ ...lead, mensagens });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const {
      clinica_id, nome, telefone, email, status, procedimento_interesse,
      data_contato, metadados
    } = req.body;

    if (!clinica_id || !telefone) {
      return res.status(400).json({ error: 'clinica_id e telefone sao obrigatorios' });
    }

    const { rows: [lead] } = await pool.query(
      `INSERT INTO leads (clinica_id, nome, telefone, email, status, procedimento_interesse, data_contato, metadados)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [clinica_id, nome, telefone, email, status || 'novo', procedimento_interesse,
        data_contato || new Date(), metadados ? JSON.stringify(metadados) : '{}']
    );

    const score = calcular(lead);
    await pool.query(`UPDATE leads SET score = $1 WHERE id = $2`, [score, lead.id]);
    lead.score = score;

    res.status(201).json(lead);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields).filter(k => !['id', 'clinica_id', 'created_at'].includes(k));
    if (keys.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
    const values = keys.map(k => fields[k]);

    const { rows: [lead] } = await pool.query(
      `UPDATE leads SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    if (!lead) return res.status(404).json({ error: 'Lead nao encontrado' });

    // Create calendar event if scheduling info was just set and lead is agendado
    if (fields.data_agendamento && lead.status === 'agendado') {
      tryCreateCalendarEvent(lead);
    }

    res.json(lead);
  } catch (err) { next(err); }
}

async function toggleBloqueio(req, res, next) {
  try {
    const { id } = req.params;
    const { rows: [lead] } = await pool.query(
      `UPDATE leads SET bloqueado = NOT bloqueado, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!lead) return res.status(404).json({ error: 'Lead nao encontrado' });
    res.json(lead);
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['novo', 'qualificacao', 'qualificado', 'agendado', 'convertido', 'followup', 'nutricao', 'arquivado'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status invalido' });
    }

    const { rows: [lead] } = await pool.query(
      `UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (!lead) return res.status(404).json({ error: 'Lead nao encontrado' });

    if (status === 'agendado') {
      if (req.app.locals.broadcast) req.app.locals.broadcast({ event: 'lead:agendado', data: lead });
      tryCreateCalendarEvent(lead);
      sendAgendamentoNotification(lead).catch(() => {});
    }

    res.json(lead);
  } catch (err) { next(err); }
}

async function getMensagens(req, res, next) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows } = await pool.query(
      `SELECT * FROM mensagens WHERE lead_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
      [id, parseInt(limit), offset]
    );

    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) as count FROM mensagens WHERE lead_id = $1`,
      [id]
    );

    res.json({ data: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

async function addMensagem(req, res, next) {
  try {
    const { id } = req.params;
    const { conteudo, tipo = 'enviada', clinica_id, send_whatsapp = false } = req.body;

    if (!conteudo) return res.status(400).json({ error: 'conteudo e obrigatorio' });

    const { rows: [lead] } = await pool.query(`SELECT id, clinica_id, telefone FROM leads WHERE id = $1`, [id]);
    if (!lead) return res.status(404).json({ error: 'Lead nao encontrado' });

    const { rows: [msg] } = await pool.query(
      `INSERT INTO mensagens (lead_id, clinica_id, conteudo, tipo) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, clinica_id || lead.clinica_id, conteudo, tipo]
    );

    await pool.query(`UPDATE leads SET updated_at = NOW() WHERE id = $1`, [id]);

    // Send to WhatsApp when requested
    if (send_whatsapp && tipo === 'enviada' && lead.telefone) {
      try {
        const { sendDirectMessage } = require('../services/baileys.service');
        await sendDirectMessage(lead.clinica_id, lead.telefone, conteudo);
      } catch (e) {
        console.warn('[Manual Send] Baileys falhou, tentando Evolution:', e.message);
        try {
          const { EVOLUTION_API_URL } = require('../config/env');
          if (EVOLUTION_API_URL) {
            const { sendText } = require('../services/evolution.service');
            const { rows: [clinica] } = await pool.query(
              `SELECT instance_name, whatsapp_instance FROM clinicas WHERE id = $1`, [lead.clinica_id]
            );
            const instanceName = clinica?.instance_name || clinica?.whatsapp_instance;
            if (instanceName) {
              let number = String(lead.telefone).replace(/\D/g, '');
              if (!number.startsWith('55')) number = '55' + number;
              await sendText(instanceName, number + '@s.whatsapp.net', conteudo);
            }
          }
        } catch (e2) { console.warn('[Manual Send] Evolution também falhou:', e2.message); }
      }
    }

    res.status(201).json(msg);
  } catch (err) { next(err); }
}

async function toggleIaPausa(req, res, next) {
  try {
    const { id } = req.params;
    const { rows: [lead] } = await pool.query(
      `UPDATE leads SET ia_pausada = NOT ia_pausada, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!lead) return res.status(404).json({ error: 'Lead nao encontrado' });
    res.json(lead);
  } catch (err) { next(err); }
}

async function getAnalysis(req, res, next) {
  try {
    const { getLatestAnalysis } = require('../services/analysis.service');
    const analysis = await getLatestAnalysis(req.params.id);
    res.json(analysis || { score: null, resumo: null, pontos_positivos: [], pontos_melhoria: [] });
  } catch (err) { next(err); }
}

async function runAnalysis(req, res, next) {
  try {
    const { analyzeConversation } = require('../services/analysis.service');
    const analysis = await analyzeConversation(req.params.id);
    res.json(analysis);
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, toggleBloqueio, updateStatus, getMensagens, addMensagem, toggleIaPausa, getAnalysis, runAnalysis };
