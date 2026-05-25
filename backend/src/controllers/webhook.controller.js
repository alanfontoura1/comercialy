const pool = require('../config/database');
const { sendText } = require('../services/evolution.service');
const { processIncomingMessage } = require('../services/baileys.service');

async function handleEvolution(req, res) {
  // Respond immediately so Evolution API doesn't retry
  res.json({ received: true });

  try {
    const event = req.body;

    // Only process incoming text messages
    if (event.event !== 'messages.upsert') return;

    const msg = event.data?.message;
    if (!msg || msg.key?.fromMe) return;

    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) return;

    const phone = remoteJid.replace(/@[^@]+$/, '');
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption;

    if (!phone || !text) return;

    const instanceName = event.instance;

    // Map instance to clinic: look up by instance_name stored in clinicas,
    // or fall back to the first clinic in DB
    const { rows } = await pool.query(
      `SELECT id FROM clinicas WHERE instance_name = $1 OR id::text = $1 LIMIT 1`,
      [instanceName]
    );
    let clinicaId = rows[0]?.id || null;

    // Use evolution sendFn instead of Baileys socket
    const result = await processIncomingMessage({
      phone,
      text,
      clinicaId,
      remoteJid,
      sock: null, // no Baileys socket — we'll send via Evolution below
      sendFn: async (to, message) => {
        await sendText(instanceName, to, message);
      },
    });

    console.log(`[Webhook:Evolution] Processado: ${phone} → ${result?.replies?.length ?? 0} respostas`);
  } catch (err) {
    console.error('[Webhook:Evolution] Erro:', err.message);
  }
}

module.exports = { handleEvolution };
