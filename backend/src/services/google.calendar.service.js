const { google } = require('googleapis');
const pool = require('../config/database');

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google/callback'
  );
}

function getAuthUrl(clinicaId) {
  const oauth2 = createOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: clinicaId,
  });
}

async function handleCallback(code, clinicaId) {
  const oauth2 = createOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  await pool.query(
    `UPDATE clinicas SET google_refresh_token = $1, updated_at = NOW() WHERE id = $2`,
    [tokens.refresh_token, clinicaId]
  );
  return tokens;
}

async function createCalendarEvent({ clinicaId, nome, procedimento, data, horario }) {
  const { rows: [clinica] } = await pool.query(
    `SELECT google_refresh_token, google_calendar_id FROM clinicas WHERE id = $1`,
    [clinicaId]
  );

  if (!clinica?.google_refresh_token) {
    console.warn(`[Calendar] Clínica ${clinicaId} sem token do Google Calendar`);
    return null;
  }

  const oauth2 = createOAuth2Client();
  oauth2.setCredentials({ refresh_token: clinica.google_refresh_token });

  // Refresh access token
  const { credentials } = await oauth2.refreshAccessToken();
  oauth2.setCredentials(credentials);

  const calendar = google.calendar({ version: 'v3', auth: oauth2 });
  const calendarId = clinica.google_calendar_id || 'primary';

  // Parse date+time: data = 'yyyy-MM-dd', horario = 'HH:mm'
  const startStr = `${data}T${horario || '09:00'}:00`;
  const startDate = new Date(startStr);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1h default

  const summary = `${nome || 'Paciente'} - ${procedimento || 'Consulta'}`;

  const event = {
    summary,
    start: { dateTime: startDate.toISOString(), timeZone: 'America/Sao_Paulo' },
    end:   { dateTime: endDate.toISOString(),   timeZone: 'America/Sao_Paulo' },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
  };

  const result = await calendar.events.insert({ calendarId, requestBody: event });
  console.log(`[Calendar] Evento criado: ${summary} em ${startStr}`);
  return result.data;
}

module.exports = { getAuthUrl, handleCallback, createCalendarEvent };
