const path = require('path');
const QRCode = require('qrcode');
const cron = require('node-cron');
const pool = require('../config/database');
const { generateReply } = require('./claude.service');

const AUTH_BASE_DIR = path.join(__dirname, '../../baileys_auth');

// clinicaId -> { sock, status, qr, phone }
const instances = new Map();
let globalBroadcast = null;

const silentLogger = {
  level: 'silent',
  trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {},
  child() { return this; },
};

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function generateTimeSlots(inicio, fim, duracaoMin = 60) {
  const slots = [];
  const [sh, sm] = inicio.split(':').map(Number);
  const [eh, em] = fim.split(':').map(Number);
  let cur = sh * 60 + sm;
  const end = eh * 60 + em;
  while (cur + duracaoMin <= end) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0');
    const m = String(cur % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    cur += duracaoMin;
  }
  return slots;
}

async function fetchSlotsNextDays(clinica, days = 7) {
  const inicio = fmtTime(clinica.horario_inicio) || '08:00';
  const fim    = fmtTime(clinica.horario_fim)    || '18:00';
  const dias   = [];
  const base   = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dow     = d.getDay();
    const dateStr = d.toISOString().split('T')[0];

    if (dow === 0 && !clinica.funciona_domingo) continue;

    const todos = generateTimeSlots(inicio, fim, 60);
    const { rows: ocupados } = await pool.query(
      `SELECT to_char(horario, 'HH24:MI') as h FROM agendamentos
       WHERE clinica_id = $1 AND data = $2 AND status != 'cancelado'`,
      [clinica.id, dateStr]
    );
    const ocupadosSet = new Set(ocupados.map(r => r.h));
    const livres = todos.filter(s => !ocupadosSet.has(s));

    if (livres.length > 0) {
      const label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
      dias.push({ dateStr, label, slots: livres });
    }
  }
  return dias;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function fmtTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

// Format a raw WhatsApp phone number for human display
// '5551999887766' → '+55 (51) 99988-7766'
// '204101426131137' → '+20 41 01426-131137' (fallback spacing)
function formatPhoneDisplay(phone) {
  if (!phone) return '';
  const d = String(phone).replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.length === 12 && d.startsWith('55')) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  // Brazilian mobile without country code: 11 digits, DDD + 9...
  if (d.length === 11 && /^[1-9][1-9]9/.test(d)) {
    return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  // Brazilian landline without country code: 10 digits
  if (d.length === 10 && /^[1-9][1-9]/.test(d)) {
    return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  // Generic international
  if (d.length >= 10) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  return phone;
}

function buildSystemPrompt({ clinica, procedimentos, procedimentos_entrada, paciente_modelo, slotsDisponiveis = [] }) {
  const atendente = clinica.nome_atendente || 'Sofia';
  const dra = clinica.nome_dra || 'a Dra';
  const draNome = clinica.nome_dra?.replace(/^(dra?\.?\s*)/i, '').split(' ')[0] || 'Dra';
  const hInicio = fmtTime(clinica.horario_inicio) || '08:00';
  const hFim    = fmtTime(clinica.horario_fim)    || '18:00';

  // Business hours context
  const now = new Date();
  const hhmm = (h, m) => h * 60 + (m || 0);
  const [sh, sm] = hInicio.split(':').map(Number);
  const [eh, em] = hFim.split(':').map(Number);
  const current = hhmm(now.getHours(), now.getMinutes());
  const domingo = now.getDay() === 0;
  const foraDoPeriodo = current < hhmm(sh, sm) || current > hhmm(eh, em);
  const foraDosHorarios = !clinica.atendente_24h && (foraDoPeriodo || (domingo && !clinica.funciona_domingo));

  // Procedures section
  let procSection = '';
  if (procedimentos?.length > 0) {
    procSection = '\n## PROCEDIMENTOS DISPONÍVEIS NA CLÍNICA:\n';
    procedimentos.forEach(p => {
      procSection += `- **${p.nome}**`;
      if (p.parcelas && p.valor_parcelado) procSection += `: ${p.parcelas}x de R$${p.valor_parcelado}`;
      if (p.valor_inteiro) procSection += ` (à vista R$${p.valor_inteiro}${p.desconto_vista ? `, ${p.desconto_vista}% de desconto` : ''})`;
      if (p.publico_ideal) procSection += ` | Indicado para: ${p.publico_ideal}`;
      if (p.duracao_minutos) procSection += ` | Duração: ${p.duracao_minutos}min`;
      procSection += '\n';
    });
  }

  let entradaSection = '';
  if (procedimentos_entrada?.length > 0) {
    entradaSection = '\n## PROCEDIMENTOS DE ENTRADA (use para downsell):\n';
    procedimentos_entrada.forEach(p => {
      entradaSection += `- **${p.nome}**: ${p.parcelas}x de R$${p.valor_parcelado}\n`;
    });
  }

  const valorMinDownsell = paciente_modelo?.valor_minimo_interesse || 500;
  const pixInfo = clinica.chave_pix ? `\n## PAGAMENTO PIX:\nChave: ${clinica.chave_pix}` : '';
  const consultaInfo = clinica.cobra_consulta && clinica.valor_consulta
    ? `\n## CONSULTA DE AVALIAÇÃO: R$${clinica.valor_consulta}${clinica.consulta_abate ? ' (valor abatido no procedimento)' : ''}`
    : '';
  const instagramInfo = clinica.instagram ? `\nInstagram da clínica: ${clinica.instagram}` : '';
  const enderecoInfo = clinica.endereco ? `\nEndereço da clínica: ${clinica.endereco}` : '';

  // Build agenda section with real available slots
  let agendaSection = '';
  if (slotsDisponiveis.length > 0) {
    agendaSection = '\n## AGENDA — HORÁRIOS DISPONÍVEIS (use EXATAMENTE estes horários):\n';
    slotsDisponiveis.forEach(({ dateStr, label, slots }) => {
      agendaSection += `${label.charAt(0).toUpperCase() + label.slice(1)} [${dateStr}]: ${slots.join(', ')}\n`;
    });
    agendaSection += '\nAo oferecer horários, SEMPRE use o formato: "QUARTA-FEIRA 14/05 às 14:00 ou QUINTA-FEIRA 15/05 às 10:00"\n';
    agendaSection += 'NUNCA diga "de manhã" ou "à tarde" sem especificar o horário exato.\n';
    agendaSection += 'Ofereça sempre 2 opções de datas/horários diferentes da lista acima.\n';
  } else {
    agendaSection = '\n## AGENDA: Não há horários cadastrados no momento. Diga que vai verificar e avise a equipe.\n';
  }

  return `Você é ${atendente}, atendente virtual da clínica ${clinica.nome} da ${dra}. Você é humana, calorosa e especialista em vendas consultivas para estética. NUNCA revele que é IA. Se perguntarem diga: "Sou a ${atendente}, atendente da clínica! Estou aqui pra te ajudar."
${instagramInfo}${enderecoInfo}${procSection}${entradaSection}${consultaInfo}${pixInfo}${agendaSection}

## REGRAS ABSOLUTAS DE COMPORTAMENTO
1. MENSAGENS CURTAS: máximo 2 linhas por mensagem. Informações maiores = múltiplas mensagens em sequência separadas por [BREAK]. NUNCA bloco de texto.
2. NUNCA repita a mesma informação que já enviou na mensagem anterior.
3. NUNCA invente informações que não estão acima. Se não souber: "Vou confirmar com a equipe e já te passo! 😊"
4. NUNCA pergunte orçamento ou quanto a pessoa quer gastar.
5. NUNCA apresente valor total. Sempre parcelado: "fica em média Xx de R$XX".
6. NUNCA ofereça horários vagos ("de manhã", "à tarde"). SEMPRE use horário exato da agenda: "quarta 14/05 às 14:00".
7. NUNCA quebre o personagem.
8. SEMPRE use o nome da pessoa a partir do momento que souber.
9. SEMPRE que detectar intenção de agendar ("sim", "quero", "vamos", "pode marcar", "gostei") vá IMEDIATAMENTE para o fluxo de agendamento.
10. Máximo 1 emoji por mensagem.
11. NUNCA encerre a conversa sem uma última tentativa de reengajamento.

## FLUXO OBRIGATÓRIO — siga essa ordem sempre:

PASSO 1 — BOAS VINDAS + NOME
"Olá! Seja bem-vinda! Eu sou a ${atendente}, da clínica da ${draNome}. 😊"[BREAK]"Qual é o seu nome?"

PASSO 2 — IDENTIFICAR INTERESSE
"[Nome]! Que bom te ter aqui. Me conta, o que te chamou atenção no nosso anúncio?"
— Se vier perguntando sobre procedimento específico: "Você já fez [procedimento] antes ou seria a primeira vez?"

PASSO 3 — RETENÇÃO (aprofundar a dor — escolha UMA conforme o contexto)
— "Há quanto tempo isso te incomoda?"
— "O que te fez querer cuidar disso agora?"
— "Como você se imagina se sentindo depois de resolver isso?"

PASSO 4 — VALORIZAÇÃO
Mensagem 1: benefício principal do procedimento em 1 linha[BREAK]
Mensagem 2: diferencial da ${draNome} em 1 linha[BREAK]
Mensagem 3: "Era um resultado assim que você estava buscando, [Nome]? 😊"

PASSO 5 — PREÇO (só após valorização)
"O investimento fica em média [Xx de R$XX] parcelado."[BREAK]${clinica.cobra_consulta && clinica.valor_consulta ? `"A avaliação com a ${draNome} é R$${clinica.valor_consulta}${clinica.consulta_abate ? ' e já é abatida no procedimento' : ''}."` : '"Ou com desconto especial à vista. 😊"'}

PASSO 6 — AGENDAMENTO (use os horários EXATOS da seção AGENDA acima)
"Deixa eu verificar a agenda da ${draNome}..."[BREAK]"Tenho [DIA-DA-SEMANA DD/MM às HH:MM] ou [DIA-DA-SEMANA DD/MM às HH:MM]. Qual fica melhor?"
— NUNCA oferecer mais de 2 opções
— Se pedir horário não disponível: "Esse horário está ocupado. 😊"[BREAK]"Posso te colocar na lista de encaixe e a ${draNome} confirma assim que abrir uma vaga!"
— Encaixe: AVISE que irá verificar com a equipe e emita [ENCAIXE:YYYY-MM-DD|HH:MM] no final da sua resposta (invisível ao lead)

PASSO 7 — CONFIRMAÇÃO DO HORÁRIO
Quando o lead confirmar o horário escolhido:
1. Confirme: "Perfeito! Vou reservar [DIA DD/MM às HH:MM] para você. 😊"[BREAK]
2. Colete: "Preciso do seu nome completo e número de celular para confirmar."
3. Após receber o nome: EMITA [AGENDAR:YYYY-MM-DD|HH:MM|Nome Completo] ao final da sua resposta (invisível ao lead)
   — Substitua "Nome Completo" pelo nome REAL que o paciente forneceu
4. ${clinica.cobra_consulta && clinica.valor_consulta && clinica.chave_pix
  ? `Após emitir [AGENDAR]: "Para garantir sua vaga, envie o comprovante do Pix de R$${clinica.valor_consulta}."[BREAK]"Nossa chave: ${clinica.chave_pix} 😊"`
  : `Confirme: "✅ Agendamento confirmado! Te esperamos! 🌸"`}

## REMARCAÇÃO
Se o paciente pedir para remarcar ("quero remarcar", "dá para mudar", "pode ser outro horário", "quero mudar"), siga o mesmo PASSO 6 e PASSO 7 com o novo horário.
O sistema cancela o agendamento antigo automaticamente quando você emite um novo [AGENDAR].
Nunca diga que precisa cancelar o anterior — apenas ofereça o novo horário e emita o [AGENDAR] normalmente.

## COMANDOS DE SISTEMA (ocultos — não aparecem no WhatsApp, só no final da mensagem):
[AGENDAR:YYYY-MM-DD|HH:MM|Nome Completo] — emita quando o paciente CONFIRMAR o horário E fornecer o nome. Exemplo: [AGENDAR:2026-05-28|10:00|Maria Silva]
[ENCAIXE:YYYY-MM-DD|HH:MM] — emita quando pedir horário não disponível e quiser encaixe

## QUEBRA DE OBJEÇÕES — respostas obrigatórias:

"Vou pensar..." →
"Claro, sem pressão! 😊"[BREAK]"Ficou alguma dúvida que eu possa te ajudar agora?"

"Tô sem dinheiro" ou "tá caro" →
"Entendo! Parcelado fica em [Xx de R$XX] — às vezes cabe melhor do que a gente imagina. 😊"[BREAK]"Quer que eu reserve uma data mais pra frente pra você já ir se programando?"
${procedimentos_entrada?.length > 0 ? `— Se persistir: "Temos também o ${procedimentos_entrada[0].nome} que é uma ótima opção pra começar, ${procedimentos_entrada[0].parcelas}x de R$${procedimentos_entrada[0].valor_parcelado}. 😊"` : ''}

"Preciso falar com meu marido/esposa" →
"Super compreensível! 😊"[BREAK]"Posso reservar um horário enquanto você decide pra não perder a vaga?"

"Não, obrigada" ou encerramento →
"Claro! 😊 Quando sentir que é a hora, estarei aqui."[BREAK]"Posso te mandar um resultado parecido com o que você busca antes de você ir?"

"Onde fica a clínica?" →
${clinica.endereco
  ? `Responda com o endereço: "${clinica.endereco}"`
  : '"Vou confirmar o endereço completo com a equipe e já te mando! 😊"'}

## DOWNSELL — ative quando lead demonstra barreira financeira com procedimento acima de R$${valorMinDownsell}:
${procedimentos_entrada?.length > 0
  ? `"Temos também o ${procedimentos_entrada[0].nome} que é uma ótima opção pra começar. 😊"[BREAK]"Fica em média ${procedimentos_entrada[0].parcelas}x de R$${procedimentos_entrada[0].valor_parcelado} parcelado — quer saber mais?"`
  : '"Temos opções que podem caber melhor no seu momento atual. Quer que eu te apresente?"'}

## LEADS PROBLEMÁTICOS:
Linguagem agressiva, xingamentos ou assédio:
"Não consigo continuar esse atendimento nesse tom. Se quiser retomar de forma respeitosa, estarei aqui."

## CONTROLE DE LOOP:
Antes de enviar qualquer mensagem verifique se a mesma informação já foi enviada anteriormente na conversa. Se sim, NÃO repita — avance o fluxo ou faça uma pergunta diferente.

${foraDosHorarios ? `## ⚠️ ATENÇÃO — FORA DO HORÁRIO DE ATENDIMENTO:
Você está fora do horário. Responda APENAS com:
"Oi! No momento estou fora do horário de atendimento. 😊"[BREAK]"Já registrei sua mensagem e te respondo assim que retornar!"
Horário de atendimento: ${hInicio} às ${hFim}${clinica.funciona_domingo ? '' : ' (segunda a sábado)'}` : `## HORÁRIO DE ATENDIMENTO: ${hInicio} às ${hFim}${clinica.funciona_domingo ? ', todos os dias' : ', segunda a sábado'}${clinica.atendente_24h ? ' (atendimento 24h)' : ''}`}

Responda sempre em português brasileiro. Use [BREAK] para separar mensagens distintas. Nunca envie parágrafos longos.`;
}

// ─── Group notifications ──────────────────────────────────────────────────────

async function sendGroupMessage(clinicaId, text) {
  const { rows: [clinica] } = await pool.query(
    'SELECT grupo_notificacao FROM clinicas WHERE id = $1', [clinicaId]
  );
  const groupJid = clinica?.grupo_notificacao;
  if (!groupJid) return;

  const inst = instances.get(clinicaId);
  if (!inst?.sock || inst.status !== 'connected') return;

  try {
    await inst.sock.sendMessage(groupJid, { text });
    console.log(`[Baileys:${clinicaId}] → Grupo: ${text.slice(0, 60)}`);
  } catch (err) {
    console.warn(`[Baileys:${clinicaId}] Falha ao enviar para grupo:`, err.message);
  }
}

async function createDoctorGroup(clinicaId) {
  const { rows: [clinica] } = await pool.query(
    'SELECT nome, nome_dra, whatsapp_dra FROM clinicas WHERE id = $1', [clinicaId]
  );
  if (!clinica?.whatsapp_dra) throw new Error('Número da Dra. não cadastrado no setup');

  const inst = instances.get(clinicaId);
  if (!inst?.sock || inst.status !== 'connected') throw new Error('WhatsApp não está conectado');

  // Normalize number: digits only, add Brazil code if missing
  let number = clinica.whatsapp_dra.replace(/\D/g, '');
  if (!number.startsWith('55')) number = '55' + number;

  // Check if number exists on WhatsApp and get the correct JID
  let drJid = number + '@s.whatsapp.net';
  try {
    const [check] = await inst.sock.onWhatsApp(number);
    if (!check?.exists) throw new Error(`Número ${number} não está registrado no WhatsApp`);
    drJid = check.jid;
    console.log(`[Baileys:${clinicaId}] JID da Dra verificado: ${drJid}`);
  } catch (err) {
    if (err.message.includes('registrado')) throw err;
    // onWhatsApp unavailable — continue with default JID
    console.warn(`[Baileys:${clinicaId}] onWhatsApp falhou, usando JID padrão:`, err.message);
  }

  const groupName = `CRM — ${clinica.nome}`;

  let result;
  try {
    result = await inst.sock.groupCreate(groupName, [drJid]);
  } catch (err) {
    throw new Error(`Falha ao criar grupo no WhatsApp: ${err.message}`);
  }

  const groupJid = result?.id || result?.newJid;
  if (!groupJid) throw new Error('WhatsApp não retornou o ID do grupo criado');

  await pool.query(
    'UPDATE clinicas SET grupo_notificacao = $1, updated_at = NOW() WHERE id = $2',
    [groupJid, clinicaId]
  );

  try {
    await inst.sock.sendMessage(groupJid, {
      text: `✅ Grupo do CRM criado!\n\nAqui você receberá:\n📅 Notificações de novos agendamentos\n📊 Relatório diário às 20h\n🔔 Alertas da ${clinica.nome}\n\nBem-vinda, ${clinica.nome_dra || 'Dra'}! 🌸`,
    });
  } catch (_) {}

  console.log(`[Baileys:${clinicaId}] Grupo criado: ${groupJid}`);
  return groupJid;
}

// ─── Daily report cron (20h) ──────────────────────────────────────────────────

function scheduleDailyReport() {
  cron.schedule('0 20 * * *', async () => {
    console.log('[Cron] Enviando relatório diário...');
    try {
      const { rows: clinicas } = await pool.query(
        'SELECT id, nome_dra, grupo_notificacao FROM clinicas WHERE grupo_notificacao IS NOT NULL'
      );

      for (const clinica of clinicas) {
        const inst = instances.get(clinica.id);
        if (!inst || inst.status !== 'connected') continue;

        const today = new Date().toISOString().split('T')[0];
        const [{ rows: [stats] }] = await Promise.all([
          pool.query(`
            SELECT
              COUNT(*) FILTER (WHERE DATE(created_at) = $2) AS recebidos_hoje,
              COUNT(*) FILTER (WHERE status IN ('qualificado','agendado','convertido')) AS qualificados,
              COUNT(*) FILTER (WHERE status = 'agendado') AS agendados,
              COUNT(*) FILTER (WHERE status = 'followup') AS followup,
              COUNT(*) FILTER (WHERE status = 'nutricao') AS nutricao,
              COUNT(*) FILTER (WHERE status = 'arquivado') AS arquivados,
              COUNT(*) AS total
            FROM leads WHERE clinica_id = $1
          `, [clinica.id, today]),
        ]);

        const conversao = stats.total > 0
          ? Math.round((stats.agendados / stats.total) * 100) : 0;

        const draNome = clinica.nome_dra?.replace(/^(dra?\.?\s*)/i, '').split(' ')[0] || 'Dra';
        const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const msg = `📊 *Relatório Comercial — ${data}*\n\nLeads recebidos hoje: ${stats.recebidos_hoje}\nQualificados: ${stats.qualificados} | Agendados: ${stats.agendados}\nFollow-up ativo: ${stats.followup} | Em nutrição: ${stats.nutricao}\nArquivados: ${stats.arquivados}\nTaxa de conversão: ${conversao}%\n\nBom descanso, ${draNome}! 🌸`;

        await sendGroupMessage(clinica.id, msg);
      }
    } catch (err) {
      console.error('[Cron] Erro no relatório diário:', err.message);
    }
  }, { timezone: 'America/Sao_Paulo' });

  console.log('[Cron] Relatório diário agendado para as 20h (Brasília)');
}

// ─── Message processor ────────────────────────────────────────────────────────

async function processIncomingMessage({ phone, text, clinicaId, remoteJid, sock: instanceSock, sendFn }) {
  let cId = clinicaId;
  if (!cId) {
    const { rows } = await pool.query('SELECT id FROM clinicas ORDER BY created_at LIMIT 1');
    if (!rows.length) { console.warn('[Baileys] Nenhuma clínica cadastrada'); return null; }
    cId = rows[0].id;
  }

  // Fetch clinic + all setup data in parallel
  let [
    { rows: [clinica] },
    { rows: procedimentos },
    { rows: procedimentos_entrada },
    { rows: [paciente_modelo] },
  ] = await Promise.all([
    pool.query(`SELECT * FROM clinicas WHERE id = $1`, [cId]),
    pool.query(`SELECT * FROM procedimentos WHERE clinica_id = $1 AND ativo = true ORDER BY nome`, [cId]),
    pool.query(`SELECT * FROM procedimentos_entrada WHERE clinica_id = $1 ORDER BY nome`, [cId]),
    pool.query(`SELECT * FROM paciente_modelo WHERE clinica_id = $1 LIMIT 1`, [cId]),
  ]);

  // Fallback: if the configured ID doesn't match any clinic, use the first clinic in DB
  if (!clinica) {
    const { rows: [first] } = await pool.query('SELECT * FROM clinicas ORDER BY created_at LIMIT 1');
    if (!first) { console.warn('[Baileys] Nenhuma clínica no banco'); return null; }
    clinica = first;
    cId = first.id;
    console.warn(`[Baileys] BAILEYS_CLINICA_ID (${clinicaId}) não encontrado — usando clínica "${first.nome}" (${first.id})`);
    const [{ rows: p }, { rows: pe }, { rows: [pm] }] = await Promise.all([
      pool.query(`SELECT * FROM procedimentos WHERE clinica_id = $1 AND ativo = true ORDER BY nome`, [cId]),
      pool.query(`SELECT * FROM procedimentos_entrada WHERE clinica_id = $1 ORDER BY nome`, [cId]),
      pool.query(`SELECT * FROM paciente_modelo WHERE clinica_id = $1 LIMIT 1`, [cId]),
    ]);
    procedimentos = p; procedimentos_entrada = pe; paciente_modelo = pm;
  }

  // Fetch available slots for the next 7 days (for system prompt)
  let slotsDisponiveis = [];
  try { slotsDisponiveis = await fetchSlotsNextDays(clinica, 4); } catch (_) {}

  // Upsert lead
  const { rows: [lead] } = await pool.query(
    `INSERT INTO leads (clinica_id, telefone, status)
     VALUES ($1, $2, 'novo')
     ON CONFLICT (clinica_id, telefone)
     DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [cId, phone]
  );

  // Always save incoming message
  await pool.query(
    `INSERT INTO mensagens (lead_id, clinica_id, conteudo, tipo) VALUES ($1, $2, $3, 'recebida')`,
    [lead.id, cId, text]
  );

  // If AI is paused
  if (!clinica.ia_ativa || lead.ia_pausada) {
    if (globalBroadcast) globalBroadcast({ type: 'new_message', leadId: lead.id, clinicaId: cId });
    return null;
  }

  // Get the most recent 50 messages in chronological order
  const { rows: rawHistory } = await pool.query(
    `SELECT conteudo, tipo FROM (
       SELECT conteudo, tipo, created_at
       FROM mensagens
       WHERE lead_id = $1
       ORDER BY created_at DESC
       LIMIT 50
     ) sub ORDER BY created_at ASC`,
    [lead.id]
  );

  // Merge consecutive messages from the same role
  // (avoids invalid alternating sequences when [BREAK] saves multiple assistant rows)
  const messages = [];
  for (const m of rawHistory) {
    const role = m.tipo === 'enviada' ? 'assistant' : 'user';
    if (messages.length > 0 && messages[messages.length - 1].role === role) {
      messages[messages.length - 1].content += '\n' + m.conteudo;
    } else {
      messages.push({ role, content: m.conteudo });
    }
  }

  const systemPrompt = buildSystemPrompt({ clinica, procedimentos, procedimentos_entrada, paciente_modelo, slotsDisponiveis });

  const { content: fullReply } = await generateReply({ systemPrompt, messages });

  // ─── Parse booking commands ───────────────────────────────────────────────
  // [AGENDAR:YYYY-MM-DD|HH:MM|Nome Completo]  — create appointment (name optional)
  // [ENCAIXE:YYYY-MM-DD|HH:MM]                — notify group about encaixe request
  const agendar = fullReply.match(/\[AGENDAR:(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})(?:\|([^\]]+))?\]/);
  const encaixe = fullReply.match(/\[ENCAIXE:(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})\]/);

  // Strip commands from the text that goes to the user
  const cleanReply = fullReply
    .replace(/\[AGENDAR:[^\]]+\]/g, '')
    .replace(/\[ENCAIXE:[^\]]+\]/g, '')
    .trim();

  // Execute [AGENDAR]
  if (agendar) {
    const [, data, horario, nomeComando] = agendar;
    try {
      const procInteresse = procedimentos.find(p =>
        lead.procedimento_interesse && p.nome.toLowerCase().includes(lead.procedimento_interesse.toLowerCase())
      );

      // Save patient name if provided in the command and lead has no name yet
      const nomePaciente = nomeComando?.trim() || lead.nome || null;
      if (nomePaciente && !lead.nome) {
        await pool.query(`UPDATE leads SET nome = $1, updated_at = NOW() WHERE id = $2`, [nomePaciente, lead.id]);
        lead.nome = nomePaciente;
      }

      // Cancel any previous active appointment for this lead before creating a new one
      await pool.query(
        `UPDATE agendamentos SET status = 'cancelado', updated_at = NOW()
         WHERE lead_id = $1 AND status IN ('agendado', 'confirmado')`,
        [lead.id]
      );

      await pool.query(
        `INSERT INTO agendamentos (lead_id, clinica_id, procedimento_id, data, horario, duracao_minutos, status, tipo, nome_paciente)
         VALUES ($1,$2,$3,$4,$5,$6,'agendado','normal',$7)`,
        [lead.id, cId, procInteresse?.id || null, data, horario, procInteresse?.duracao_minutos || 60, nomePaciente]
      );
      await pool.query(
        `UPDATE leads SET status = 'agendado', data_agendamento = $1, horario_agendamento = $2, updated_at = NOW() WHERE id = $3`,
        [data, horario, lead.id]
      );

      const dataFmt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
      const nomeDisplay = nomePaciente || formatPhoneDisplay(phone);
      const proc = procInteresse?.nome || lead.procedimento_interesse || null;
      await sendGroupMessage(cId,
        `📅 NOVO AGENDAMENTO (IA)\n\nPaciente: ${nomeDisplay}\nTelefone: ${formatPhoneDisplay(phone)}${proc ? `\nProcedimento: ${proc}` : ''}\nData: ${dataFmt} às ${horario}`
      );
      console.log(`[Baileys:${cId}] Agendamento criado: ${nomeDisplay} em ${data} ${horario}`);
    } catch (err) {
      console.error(`[Baileys:${cId}] Erro ao criar agendamento:`, err.message);
    }
  }

  // Execute [ENCAIXE]
  if (encaixe) {
    const [, data, horario] = encaixe;
    try {
      const dataFmt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
      const nome = lead.nome || formatPhoneDisplay(phone);
      await sendGroupMessage(cId,
        `⚡ SOLICITAÇÃO DE ENCAIXE\n\nPaciente: ${nome}\nTelefone: ${formatPhoneDisplay(phone)}\nHorário solicitado: ${dataFmt} às ${horario}\n\nResponda aqui para confirmar ou reagendar.`
      );
      console.log(`[Baileys:${cId}] Encaixe notificado para ${nome}`);
    } catch (err) {
      console.error(`[Baileys:${cId}] Erro ao notificar encaixe:`, err.message);
    }
  }

  // Split on [BREAK] for multi-message sending
  const parts = cleanReply.split('[BREAK]').map(p => p.trim()).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));

    await pool.query(
      `INSERT INTO mensagens (lead_id, clinica_id, conteudo, tipo) VALUES ($1, $2, $3, 'enviada')`,
      [lead.id, cId, parts[i]]
    );

    if (sendFn) {
      await sendFn(remoteJid, parts[i]);
      console.log(`[Evolution:${cId}] → ${phone}: ${parts[i].slice(0, 80)}`);
    } else if (instanceSock) {
      await instanceSock.sendMessage(remoteJid, { text: parts[i] });
      console.log(`[Baileys:${cId}] → ${phone}: ${parts[i].slice(0, 80)}`);
    }
  }

  // Bump score
  await pool.query(
    `UPDATE leads SET score = LEAST(score + 5, 100), updated_at = NOW() WHERE id = $1`,
    [lead.id]
  );

  if (globalBroadcast) globalBroadcast({ type: 'new_message', leadId: lead.id, clinicaId: cId });
  return { replies: parts, leadId: lead.id };
}

// ─── Per-clinica Baileys instance ─────────────────────────────────────────────

async function startClinicaInstance(clinicaId) {
  const existing = instances.get(clinicaId);
  if (existing && (existing.status === 'connected' || existing.status === 'connecting')) return;

  const baileys = await import('@whiskeysockets/baileys');
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

  const authDir = path.join(AUTH_BASE_DIR, clinicaId);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const inst = { sock: null, status: 'connecting', qr: null, phone: null };
  instances.set(clinicaId, inst);

  const sock = makeWASocket({
    version, auth: state, logger: silentLogger,
    printQRInTerminal: true,
    browser: ['Comercialy CRM', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
  });

  inst.sock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      try {
        inst.qr = await QRCode.toDataURL(qr);
        inst.status = 'connecting';
        console.log(`[Baileys:${clinicaId}] QR Code pronto`);
        if (globalBroadcast) globalBroadcast({ type: 'baileys_qr', clinicaId, status: 'connecting' });
      } catch (e) { console.error(`[Baileys:${clinicaId}] Erro ao gerar QR:`, e.message); }
    }

    if (connection === 'open') {
      inst.qr = null;
      inst.status = 'connected';
      inst.phone = sock.user?.id?.split(':')[0] ?? null;
      console.log(`[Baileys:${clinicaId}] Conectado! Número: ${inst.phone}`);
      if (globalBroadcast) globalBroadcast({ type: 'baileys_status', clinicaId, status: 'connected', phone: inst.phone });
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      inst.status = 'disconnected';
      inst.phone = null;
      console.log(`[Baileys:${clinicaId}] Desconectado (código ${code}). Reconectar: ${shouldReconnect}`);
      if (globalBroadcast) globalBroadcast({ type: 'baileys_status', clinicaId, status: 'disconnected' });
      if (shouldReconnect) setTimeout(() => startClinicaInstance(clinicaId), 5000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
    if (type !== 'notify') return;

    for (const msg of msgs) {
      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) continue;

      const phone = remoteJid.replace(/@[^@]+$/, '');
      const msgContent = msg.message;
      const text =
        msgContent?.conversation ||
        msgContent?.extendedTextMessage?.text ||
        msgContent?.imageMessage?.caption;

      const mediaType = msgContent?.imageMessage ? 'image'
        : msgContent?.audioMessage ? 'audio'
        : msgContent?.stickerMessage ? 'sticker'
        : msgContent?.videoMessage ? 'video'
        : msgContent?.documentMessage ? 'document'
        : null;

      if (!phone) continue;

      // Media message without text caption — save placeholder and skip AI
      if (mediaType && !text) {
        const labels = { image: '[Imagem]', audio: '[Áudio]', sticker: '[Figurinha]', video: '[Vídeo]', document: '[Documento]' };
        try {
          const { rows: [lead] } = await pool.query(
            `SELECT id, clinica_id FROM leads WHERE telefone = $1 AND clinica_id = $2 LIMIT 1`,
            [phone, clinicaId]
          );
          if (lead) {
            await pool.query(
              `INSERT INTO mensagens (lead_id, clinica_id, conteudo, tipo, media_type) VALUES ($1,$2,$3,'recebida',$4)`,
              [lead.id, lead.clinica_id, labels[mediaType] || '[Mídia]', mediaType]
            );
          }
        } catch (e) { console.warn(`[Baileys:${clinicaId}] Erro ao salvar mídia:`, e.message); }
        continue;
      }

      if (!text) continue;
      console.log(`[Baileys:${clinicaId}] ← ${phone}: ${text.slice(0, 80)}`);

      try {
        await processIncomingMessage({ phone, text, clinicaId, remoteJid, sock });
      } catch (err) {
        console.error(`[Baileys:${clinicaId}] Erro ao processar:`, err.message);
      }
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function startBaileys(broadcast) {
  globalBroadcast = broadcast;
  scheduleDailyReport();

  const clinicaId = process.env.BAILEYS_CLINICA_ID;
  if (clinicaId) {
    console.log(`[Baileys] Iniciando para clínica ${clinicaId}...`);
    await startClinicaInstance(clinicaId);
  }
}

async function startByToken(token) {
  const { rows: [clinica] } = await pool.query(
    'SELECT id FROM clinicas WHERE whatsapp_token = $1', [token]
  );
  if (!clinica) return null;
  await startClinicaInstance(clinica.id);
  return clinica.id;
}

function getStatus(clinicaId) {
  const cId = clinicaId || process.env.BAILEYS_CLINICA_ID;
  if (cId) {
    const inst = instances.get(cId);
    if (!inst) return { status: 'disconnected', qr: null, phone: null, connected: false };
    return { status: inst.status, qr: inst.qr, phone: inst.phone, connected: inst.status === 'connected' };
  }
  const first = [...instances.values()][0];
  if (first) return { status: first.status, qr: first.qr, phone: first.phone, connected: first.status === 'connected' };
  return { status: 'disconnected', qr: null, phone: null, connected: false };
}

async function getStatusByToken(token) {
  const { rows: [clinica] } = await pool.query(
    'SELECT id, nome, nome_atendente FROM clinicas WHERE whatsapp_token = $1', [token]
  );
  if (!clinica) return null;
  return { ...getStatus(clinica.id), clinicaId: clinica.id, nome: clinica.nome, nome_atendente: clinica.nome_atendente };
}

async function disconnect(clinicaId) {
  const cId = clinicaId || process.env.BAILEYS_CLINICA_ID;
  const inst = instances.get(cId);
  if (inst?.sock) { await inst.sock.logout().catch(() => {}); inst.sock = null; }
  if (inst) { inst.status = 'disconnected'; inst.qr = null; inst.phone = null; }
}

async function reconnect(clinicaId) {
  const cId = clinicaId || process.env.BAILEYS_CLINICA_ID;
  await disconnect(cId);
  const fs = require('fs');
  const authDir = path.join(AUTH_BASE_DIR, cId);
  if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
  instances.delete(cId);
  await startClinicaInstance(cId);
}

async function sendDirectMessage(clinicaId, telefone, text) {
  const inst = instances.get(clinicaId);
  if (!inst?.sock || inst.status !== 'connected') throw new Error('WhatsApp não conectado');
  let number = String(telefone).replace(/\D/g, '');
  if (!number.startsWith('55')) number = '55' + number;
  const remoteJid = number + '@s.whatsapp.net';
  await inst.sock.sendMessage(remoteJid, { text });
  console.log(`[Baileys:${clinicaId}] → ${number}: ${text.slice(0, 60)}`);
}

module.exports = { startBaileys, startByToken, getStatus, getStatusByToken, disconnect, reconnect, createDoctorGroup, sendGroupMessage, processIncomingMessage, sendDirectMessage };
