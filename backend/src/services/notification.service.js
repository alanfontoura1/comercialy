const evolution = require('./evolution.service');
const { NOTIFICATION_GROUP_JID } = require('../config/env');

async function notificarGrupo(mensagem) {
  if (!NOTIFICATION_GROUP_JID) return;
  try {
    await evolution.sendText('default', NOTIFICATION_GROUP_JID, mensagem);
  } catch (err) {
    console.error('[Notification] Error:', err.message);
  }
}

async function notificarAgendamento(agendamento) {
  const msg = `*Novo Agendamento*\n\n` +
    `Lead: ${agendamento.lead_nome}\n` +
    `Telefone: ${agendamento.telefone}\n` +
    `Procedimento: ${agendamento.procedimento_nome}\n` +
    `Data: ${agendamento.data}\n` +
    `Horario: ${agendamento.horario}`;
  await notificarGrupo(msg);
}

module.exports = { notificarGrupo, notificarAgendamento };
