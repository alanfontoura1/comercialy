const cron = require('node-cron');
const pool = require('../config/database');
const evolution = require('./evolution.service');

async function checkFollowups() {
  try {
    const { rows } = await pool.query(`
      SELECT l.*, c.whatsapp_instance, c.follow_up_manha, c.nome as clinica_nome
      FROM leads l JOIN clinicas c ON c.id = l.clinica_id
      WHERE l.status = 'followup' AND l.bloqueado = false
      AND l.follow_up_count < 9
      AND (l.ultimo_followup IS NULL OR l.ultimo_followup < NOW() - INTERVAL '12 hours')
    `);

    for (const lead of rows) {
      try {
        const msg = gerarMensagemFollowup(lead);
        if (lead.whatsapp_instance) {
          await evolution.sendText(lead.whatsapp_instance, lead.telefone + '@s.whatsapp.net', msg);
        }
        await pool.query(
          `UPDATE leads SET follow_up_count = follow_up_count + 1, ultimo_followup = NOW() WHERE id = $1`,
          [lead.id]
        );
        await pool.query(
          `INSERT INTO mensagens (lead_id, clinica_id, conteudo, tipo) VALUES ($1, $2, $3, 'enviada')`,
          [lead.id, lead.clinica_id, msg]
        );
        // Archive after 9 attempts
        if (lead.follow_up_count + 1 >= 9) {
          await pool.query(`UPDATE leads SET status = 'arquivado' WHERE id = $1`, [lead.id]);
        }
      } catch (err) {
        console.error('[Followup] Error for lead', lead.id, err.message);
      }
    }
  } catch (err) {
    console.error('[Followup] checkFollowups error:', err.message);
  }
}

function gerarMensagemFollowup(lead) {
  const msgs = [
    `Ola ${lead.nome || 'tudo bem'}! Ainda esta pensando no procedimento? Posso te ajudar com alguma duvida?`,
    `Oi! Passando para saber se posso ajudar com mais informacoes sobre ${lead.procedimento_interesse || 'nossos tratamentos'}.`,
    `Ola! A agenda esta quentinha essa semana. Quer que eu reserve um horario para voce?`,
  ];
  return msgs[lead.follow_up_count % msgs.length];
}

function startFollowupJobs() {
  cron.schedule('0 9,14,19 * * *', checkFollowups);
  console.log('[Cron] Follow-up jobs scheduled');
}

module.exports = { startFollowupJobs, checkFollowups };
