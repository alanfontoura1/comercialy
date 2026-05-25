const { Router } = require('express');
const { getAuthUrl, handleCallback } = require('../services/google.calendar.service');
const auth = require('../middleware/auth');

const router = Router();

// GET /api/google/auth?clinica_id=xxx  — redirect to Google consent screen
router.get('/auth', auth, (req, res) => {
  const { clinica_id } = req.query;
  if (!clinica_id) return res.status(400).json({ error: 'clinica_id obrigatório' });
  const url = getAuthUrl(clinica_id);
  res.redirect(url);
});

// GET /api/google/callback  — Google redirects here after consent
router.get('/callback', async (req, res) => {
  const { code, state: clinicaId, error } = req.query;
  if (error) return res.status(400).send(`<h2>Erro: ${error}</h2>`);
  if (!code || !clinicaId) return res.status(400).send('<h2>Parâmetros inválidos</h2>');
  try {
    await handleCallback(String(code), String(clinicaId));
    res.send(`
      <!DOCTYPE html>
      <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2 style="color:#10b981">✓ Google Calendar conectado!</h2>
        <p>Você já pode fechar esta janela.</p>
        <script>setTimeout(()=>window.close(),2000)</script>
      </body></html>
    `);
  } catch (err) {
    console.error('[Google callback] erro:', err.message);
    res.status(500).send(`<h2>Erro ao conectar: ${err.message}</h2>`);
  }
});

// GET /api/google/status?clinica_id=xxx  — check if clinica has token
router.get('/status', auth, async (req, res, next) => {
  try {
    const { clinica_id } = req.query;
    if (!clinica_id) return res.status(400).json({ error: 'clinica_id obrigatório' });
    const pool = require('../config/database');
    const { rows: [row] } = await pool.query(
      `SELECT google_refresh_token IS NOT NULL AS connected FROM clinicas WHERE id = $1`,
      [clinica_id]
    );
    res.json({ connected: row?.connected ?? false });
  } catch (err) { next(err); }
});

// DELETE /api/google/disconnect?clinica_id=xxx  — remove stored token
router.delete('/disconnect', auth, async (req, res, next) => {
  try {
    const { clinica_id } = req.query;
    if (!clinica_id) return res.status(400).json({ error: 'clinica_id obrigatório' });
    const pool = require('../config/database');
    await pool.query(`UPDATE clinicas SET google_refresh_token = NULL WHERE id = $1`, [clinica_id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
