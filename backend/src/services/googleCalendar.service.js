const { google } = require('googleapis');
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = require('../config/env');

function getClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

async function criarEvento(agendamento, tokens) {
  try {
    const auth = getClient();
    auth.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth });
    const start = new Date(`${agendamento.data}T${agendamento.horario}`);
    const end = new Date(start.getTime() + agendamento.duracao_minutos * 60000);
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `${agendamento.lead_nome} — ${agendamento.procedimento_nome}`,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });
    return event.data.id;
  } catch (err) {
    console.error('[GoogleCalendar] criarEvento error:', err.message);
    return null;
  }
}

async function cancelarEvento(eventId, tokens) {
  try {
    const auth = getClient();
    auth.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({ calendarId: 'primary', eventId });
  } catch (err) {
    console.error('[GoogleCalendar] cancelarEvento error:', err.message);
  }
}

module.exports = { criarEvento, cancelarEvento, getClient };
