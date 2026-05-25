const pool = require('../config/database');
const { sendText } = require('../services/evolution.service');
const { processIncomingMessage } = require('../services/baileys.service');

async function handleEvolution(req, res) {
  // Respond immediately so Evolution API doesn't retry
  res.json({ received: true });

  try {
    const event = req.body;

    if (event.event !== 'messages.upsert') return;

    const data = event.data;
    if (!data) return;

    const remoteJid = data.key?.remoteJid;
    if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) return;

    const phone = remoteJid.replace(/@[^@]+$/, '');
    const text =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text ||
      data.message?.imageMessage?.caption;

    if (!phone) return;

    const instanceName = event.instance;
    const { rows } = await pool.query(
      `SELECT id FROM clinicas WHERE instance_name = $1 OR id::text = $1 LIMIT 1`,
      [instanceName]
    );
    const clinicaId = rows[0]?.id || null;

    // ── Messages sent from the connected phone (fromMe) ───────────────────────
    if (data.key?.fromMe) {
      if (!text || !clinicaId) return;

      // Find the lead this conversation belongs to
      const { rows: [lead] } = await pool.query(
        `SELECT id FROM leads WHERE clinica_id = $1 AND telefone = $2 LIMIT 1`,
        [clinicaId, phone]
      );
      if (!lead) return;

      // Dedup: skip if the same text was saved in the last 30s via the dashboard API
      const { rows: dups } = await pool.query(
        `SELECT id FROM mensagens
         WHERE lead_id = $1 AND conteudo = $2 AND tipo = 'enviada'
           AND created_at > NOW() - INTERVAL '30 seconds'
         LIMIT 1`,
        [lead.id, text]
      );
      if (dups.length > 0) return;

      await pool.query(
        `INSERT INTO mensagens (lead_id, clinica_id, conteudo, tipo) VALUES ($1, $2, $3, 'enviada')`,
        [lead.id, clinicaId, text]
      );
      console.log(`[Webhook:Evolution] fromMe salvo: ${phone}: ${text.slice(0, 60)}`);
      return;
    }

    // ── Incoming message from client ──────────────────────────────────────────
    if (!text) return;

    const result = await processIncomingMessage({
      phone,
      text,
      clinicaId,
      remoteJid,
      sock: null,
      sendFn: async (to, message) => {
        await sendText(instanceName, to, message);
      },
    });

    console.log(`[Webhook:Evolution] Processado: ${phone} → ${result?.replies?.length ?? 0} respostas`);
  } catch (err) {
    console.error('[Webhook:Evolution] Erro:', err.message, err.data ?? '');
  }
}

module.exports = { handleEvolution };
