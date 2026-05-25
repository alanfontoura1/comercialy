const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const baileys = require('../services/baileys.service');

// GET /api/baileys/status — authenticated, returns status (optionally filtered by clinica_id)
router.get('/status', authMiddleware, (req, res) => {
  res.json(baileys.getStatus(req.query.clinica_id || null));
});

// POST /api/baileys/reconnect — clears session and shows new QR
router.post('/reconnect', authMiddleware, async (req, res, next) => {
  try {
    const { clinica_id } = req.body;
    await baileys.reconnect(clinica_id);
    res.json({ ok: true, message: 'Reconectando — aguarde o novo QR Code' });
  } catch (err) { next(err); }
});

// POST /api/baileys/disconnect — logout
router.post('/disconnect', authMiddleware, async (req, res, next) => {
  try {
    const { clinica_id } = req.body;
    await baileys.disconnect(clinica_id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/baileys/create-group — creates WhatsApp group with the doctor
router.post('/create-group', authMiddleware, async (req, res, next) => {
  try {
    const { clinica_id } = req.body;
    if (!clinica_id) return res.status(400).json({ error: 'clinica_id obrigatório' });
    const groupJid = await baileys.createDoctorGroup(clinica_id);
    res.json({ ok: true, groupJid });
  } catch (err) { next(err); }
});

// ─── Public routes — token serves as auth ────────────────────────────────────

// GET /api/baileys/connect/:token — returns status + QR (no auth, token is the key)
router.get('/connect/:token', async (req, res, next) => {
  try {
    const status = await baileys.getStatusByToken(req.params.token);
    if (!status) return res.status(404).json({ error: 'Link inválido ou expirado' });
    res.json(status);
  } catch (err) { next(err); }
});

// POST /api/baileys/connect/:token/start — starts Baileys instance for this clinica
router.post('/connect/:token/start', async (req, res, next) => {
  try {
    const clinicaId = await baileys.startByToken(req.params.token);
    if (!clinicaId) return res.status(404).json({ error: 'Link inválido ou expirado' });
    res.json({ ok: true, clinicaId });
  } catch (err) { next(err); }
});

module.exports = router;
