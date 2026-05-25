const { EVOLUTION_API_URL, EVOLUTION_API_KEY } = require('../config/env');

async function request(method, path, body) {
  const res = await fetch(`${EVOLUTION_API_URL}${path.replace(/ /g, '%20')}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Evolution API error'), { status: res.status, data });
  return data;
}

async function createInstance(instanceName) {
  return request('POST', '/instance/create', {
    instanceName,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
  });
}

async function getQRCode(instanceName) {
  return request('GET', `/instance/connect/${instanceName}`);
}

async function sendText(instanceName, to, text) {
  return request('POST', `/message/sendText/${instanceName}`, {
    number: to,
    text,
  });
}

async function getInstanceStatus(instanceName) {
  return request('GET', `/instance/connectionState/${instanceName}`);
}

module.exports = { createInstance, getQRCode, sendText, getInstanceStatus };
