function calcular(lead, mensagens = []) {
  let score = 0;

  // Procedure mentioned
  if (lead.procedimento_interesse) score += 20;

  // Recent contact (last 24h)
  if (lead.data_contato && (Date.now() - new Date(lead.data_contato)) < 86400000) score += 20;

  // Has email
  if (lead.email) score += 10;

  // Message count (engagement)
  const count = mensagens.length;
  if (count >= 6) score += 25;
  else if (count >= 3) score += 15;
  else if (count >= 1) score += 5;

  // Status advancement
  const statusBonus = { qualificacao: 5, qualificado: 15, agendado: 30, convertido: 40 };
  score += statusBonus[lead.status] || 0;

  return Math.min(100, score);
}

module.exports = { calcular };
