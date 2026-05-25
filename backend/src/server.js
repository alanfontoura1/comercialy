require('./config/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { WebSocketServer } = require('ws');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { PORT, FRONTEND_URL, NODE_ENV } = require('./config/env');

const app = express();
const server = http.createServer(app);

// ─── WebSocket ───────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);
  ws.on('close', () => console.log('[WS] Client disconnected'));
});

// Broadcast helper available globally
app.locals.broadcast = (data) => {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
};

// ─── Security & parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Rate limiting ───────────────────────────────────────────────────────────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
}));

app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
}));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Standalone QR page — accessible from any device without needing the frontend
app.get('/connect/:token', (req, res) => {
  const token = req.params.token;
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Conectar WhatsApp — Comercialy</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0f0a1a;color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#1a1025;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
    .logo{font-size:22px;font-weight:700;color:#8b5cf6;margin-bottom:8px}
    .sub{font-size:13px;color:rgba(255,255,255,0.35);margin-bottom:32px}
    .status-badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;margin-bottom:24px}
    .badge-connecting{background:rgba(245,158,11,0.15);color:#f59e0b}
    .badge-connected{background:rgba(16,185,129,0.15);color:#10b981}
    .badge-disconnected{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.3)}
    .qr-wrap{background:#fff;border-radius:16px;padding:16px;display:inline-block;margin:0 auto 24px}
    .qr-wrap img{display:block;width:220px;height:220px}
    .instructions{font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:20px}
    .instructions strong{color:rgba(255,255,255,0.8)}
    .success-icon{font-size:56px;margin-bottom:16px}
    .success-title{font-size:20px;font-weight:700;color:#10b981;margin-bottom:8px}
    .phone{font-size:14px;color:rgba(255,255,255,0.4)}
    .spinner{width:44px;height:44px;border:3px solid rgba(139,92,246,0.2);border-top-color:#8b5cf6;border-radius:50%;animation:spin 0.8s linear infinite;margin:24px auto}
    @keyframes spin{to{transform:rotate(360deg)}}
    .waiting-text{font-size:14px;color:rgba(255,255,255,0.35);margin-top:12px}
    .btn{display:inline-flex;align-items:center;gap:6px;margin-top:20px;padding:10px 20px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:13px;cursor:pointer;text-decoration:none}
    .btn:hover{background:rgba(255,255,255,0.1)}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">Comercialy</div>
  <div class="sub">Conexão WhatsApp</div>
  <div id="content">
    <div class="spinner"></div>
    <div class="waiting-text">Iniciando conexão...</div>
  </div>
</div>
<script>
const TOKEN = '${token}';
const BASE = window.location.origin;
let pollTimer = null;

async function start() {
  try {
    await fetch(BASE + '/api/baileys/connect/' + TOKEN + '/start', { method: 'POST' });
  } catch(e) {}
  poll();
}

async function poll() {
  try {
    const r = await fetch(BASE + '/api/baileys/connect/' + TOKEN);
    if (!r.ok) { showError(); return; }
    const d = await r.json();
    render(d);
    if (d.status === 'connected') return;
    pollTimer = setTimeout(poll, d.status === 'connecting' ? 2500 : 4000);
  } catch(e) {
    pollTimer = setTimeout(poll, 5000);
  }
}

function render(d) {
  const el = document.getElementById('content');
  if (d.status === 'connected') {
    el.innerHTML = '<div class="success-icon">✅</div><div class="success-title">WhatsApp Conectado!</div><div class="phone">' + (d.phone ? '+' + d.phone : '') + '</div><div class="waiting-text" style="margin-top:12px">Você já pode fechar esta aba.</div>';
    return;
  }
  if (d.status === 'connecting' && d.qr) {
    el.innerHTML = '<span class="status-badge badge-connecting">● Aguardando escaneamento</span><div class="qr-wrap"><img src="' + d.qr + '" alt="QR Code"/></div><div class="instructions"><strong>Como conectar:</strong><br/>1. Abra o WhatsApp no celular<br/>2. Toque em ⋮ → <strong>Aparelhos conectados</strong><br/>3. Toque em <strong>Conectar aparelho</strong><br/>4. Aponte a câmera para o QR acima</div>';
    return;
  }
  el.innerHTML = '<div class="spinner"></div><div class="waiting-text">Gerando QR Code…</div>';
}

function showError() {
  document.getElementById('content').innerHTML = '<div style="color:#f87171;margin:20px 0">Link inválido ou expirado.</div>';
}

start();
</script>
</body>
</html>`);
});

app.use('/api', routes);

app.use('*', (req, res) => {
  res.status(404).json({ error: `Rota nao encontrada: ${req.method} ${req.originalUrl}` });
});

// ─── Error handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\nComercially Backend`);
  console.log(`   API:       http://localhost:${PORT}/api`);
  console.log(`   Health:    http://localhost:${PORT}/health`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   Env:       ${NODE_ENV}\n`);

  const { startFollowupJobs } = require('./services/followup.service');
  startFollowupJobs();

  // Start Baileys when Evolution API is not configured
  const { EVOLUTION_API_URL } = require('./config/env');
  if (!EVOLUTION_API_URL) {
    console.log('[Baileys] Evolution API não configurada — iniciando Baileys...');
    const { startBaileys } = require('./services/baileys.service');
    startBaileys(app.locals.broadcast).catch(err =>
      console.error('[Baileys] Erro ao iniciar:', err.message)
    );
  }
});

module.exports = { app, server };
