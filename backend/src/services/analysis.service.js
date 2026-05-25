const pool = require('../config/database');
const { generateReply } = require('./claude.service');

const ANALYSIS_SYSTEM_PROMPT = `Você é um especialista em vendas consultivas e comunicação digital para clínicas estéticas.
Analise a conversa de atendimento via WhatsApp fornecida e retorne um JSON estruturado com avaliação e sugestões de melhoria.

Avalie com base nestas 8 regras de atendimento de alta conversão:
1. MENSAGENS CURTAS: respostas de até 3 linhas, quebradas em partes quando necessário
2. SEM PERGUNTAR ORÇAMENTO: nunca perguntar diretamente quanto quer gastar
3. PRIMEIRO NOME: perguntar nome na primeira mensagem e usar nas seguintes
4. PREÇO PARCELADO: nunca apresentar valor total; sempre parcelado após valorizar; formato "10x de R$XX"
5. OBJEÇÃO: nunca encerrar sem tentativa elegante quando o lead recusar
6. EMOJIS: no máximo 1 por mensagem
7. VARIEDADE: nunca começar duas mensagens seguidas da mesma forma
8. QUEBRA EM PARTES: informação maior deve ser enviada em mensagens separadas

Retorne APENAS um JSON válido (sem markdown, sem texto fora do JSON) neste formato exato:
{
  "score": <número de 0 a 100>,
  "resumo": "<resumo de 1-2 frases da qualidade geral do atendimento>",
  "pontos_positivos": ["<ponto positivo 1>", "<ponto positivo 2>"],
  "pontos_melhoria": [
    {
      "regra": "<nome curto da regra violada>",
      "ocorreu": "<o que aconteceu de errado na conversa, citando trecho real>",
      "deveria": "<como deveria ter sido, com orientação clara>",
      "exemplo": "<exemplo concreto de como responder corretamente>"
    }
  ]
}`;

async function analyzeConversation(leadId) {
  const { rows: msgs } = await pool.query(
    `SELECT conteudo, tipo FROM mensagens WHERE lead_id = $1 ORDER BY created_at ASC LIMIT 30`,
    [leadId]
  );

  if (msgs.length < 2) {
    return {
      score: 0,
      resumo: 'Conversa muito curta para análise.',
      pontos_positivos: [],
      pontos_melhoria: [],
    };
  }

  const conversaFormatada = msgs
    .map(m => `${m.tipo === 'enviada' ? '[IA]' : '[CLIENTE]'}: ${m.conteudo}`)
    .join('\n');

  try {
    const { content } = await generateReply({
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Analise este atendimento:\n\n${conversaFormatada}` }],
      temperature: 0.3,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON não encontrado na resposta da IA');

    const analysis = JSON.parse(jsonMatch[0]);

    const { rows: [lead] } = await pool.query('SELECT clinica_id FROM leads WHERE id = $1', [leadId]);

    await pool.query(
      `INSERT INTO conversation_analysis (lead_id, clinica_id, score, resumo, pontos_positivos, pontos_melhoria)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        leadId,
        lead?.clinica_id,
        analysis.score,
        analysis.resumo,
        JSON.stringify(analysis.pontos_positivos || []),
        JSON.stringify(analysis.pontos_melhoria || []),
      ]
    );

    return analysis;
  } catch (err) {
    console.error('[Analysis] Erro:', err.message);
    return {
      score: 0,
      resumo: 'Erro ao analisar a conversa. Tente novamente.',
      pontos_positivos: [],
      pontos_melhoria: [],
    };
  }
}

async function getLatestAnalysis(leadId) {
  const { rows: [analysis] } = await pool.query(
    `SELECT * FROM conversation_analysis WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [leadId]
  );
  return analysis || null;
}

module.exports = { analyzeConversation, getLatestAnalysis };
