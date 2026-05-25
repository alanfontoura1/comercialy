const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const { GEMINI_API_KEY, GROQ_API_KEY } = require('../config/env');

// Qual provider usar: 'gemini' ou 'groq'
const AI_PROVIDER = process.env.AI_PROVIDER || (GEMINI_API_KEY && GEMINI_API_KEY !== 'cole_sua_chave_aqui' ? 'gemini' : 'groq');

// ─── Gemini ───────────────────────────────────────────────────────────────────
const GEMINI_MODELS = {
  'gemini-2.0-flash': 'gemini-2.0-flash',
  'gemini-1.5-flash': 'gemini-1.5-flash',
  'gemini-1.5-pro':   'gemini-1.5-pro',
};

async function geminiReply({ systemPrompt, messages, model, temperature }) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const resolvedModel = GEMINI_MODELS[model] || 'gemini-2.0-flash';

  const geminiModel = genAI.getGenerativeModel({
    model: resolvedModel,
    systemInstruction: systemPrompt,
    generationConfig: { temperature, maxOutputTokens: 1024 },
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  const text = result.response.text();
  const usageMeta = result.response.usageMetadata;

  return {
    content: text,
    inputTokens:  usageMeta?.promptTokenCount    || 0,
    outputTokens: usageMeta?.candidatesTokenCount || 0,
  };
}

// ─── Groq ─────────────────────────────────────────────────────────────────────
const GROQ_MODELS = {
  'groq-llama3-8b':    'llama-3.1-8b-instant',
  'groq-llama3-70b':   'llama-3.3-70b-versatile',
  'groq-mixtral':      'mixtral-8x7b-32768',
  // aliases mapeados para 8b-instant (limite diário de 500K tokens, 5x maior que 70b)
  'gemini-2.0-flash':  'llama-3.1-8b-instant',
  'gemini-1.5-flash':  'llama-3.1-8b-instant',
  'gemini-1.5-pro':    'llama-3.1-8b-instant',
  'claude-sonnet-4-6': 'llama-3.1-8b-instant',
};

async function groqReply({ systemPrompt, messages, model, temperature }) {
  const groq = new Groq({ apiKey: GROQ_API_KEY });
  const resolvedModel = GROQ_MODELS[model] || 'llama-3.1-8b-instant';

  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ];

  const completion = await groq.chat.completions.create({
    model: resolvedModel,
    messages: groqMessages,
    temperature,
    max_tokens: 1024,
  });

  const choice = completion.choices[0];
  return {
    content: choice.message.content,
    inputTokens:  completion.usage?.prompt_tokens     || 0,
    outputTokens: completion.usage?.completion_tokens || 0,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────
async function generateReply({ systemPrompt, messages, model = 'gemini-2.0-flash', temperature = 0.7 }) {
  const provider = AI_PROVIDER;
  console.log(`[AI] Provider: ${provider} | Model: ${model}`);

  if (provider === 'gemini') return geminiReply({ systemPrompt, messages, model, temperature });
  return groqReply({ systemPrompt, messages, model, temperature });
}

module.exports = { generateReply };
