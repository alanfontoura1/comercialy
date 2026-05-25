require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log('[Seed] Starting seed...');

  // Clinicas
  const clinicasData = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      nome: 'Bella Estetica SP',
      nome_dra: 'Dra. Isabela Mendonca',
      nome_atendente: 'Sofia',
      instagram: '@bellasteticasp',
      tom: 'Sofisticado e acolhedor, focado em resultados naturais',
      horario_inicio: '09:00',
      horario_fim: '19:00',
      whatsapp_instance: 'bella-sp',
      cobra_consulta: true,
      valor_consulta: 150.00,
      chave_pix: 'bella@estetica.com.br',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      nome: 'Clinica Aurora RJ',
      nome_dra: 'Dra. Camila Aurora',
      nome_atendente: 'Luna',
      instagram: '@clinicaauroranj',
      tom: 'Moderno e direto, transmitindo confianca e expertise',
      horario_inicio: '08:00',
      horario_fim: '18:00',
      whatsapp_instance: 'aurora-rj',
      cobra_consulta: false,
      chave_pix: 'aurora@clinica.com.br',
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      nome: 'Renova BH',
      nome_dra: 'Dra. Fernanda Renova',
      nome_atendente: 'Clara',
      instagram: '@renovabh',
      tom: 'Friendly e empoderador, celebrando a beleza natural',
      horario_inicio: '08:00',
      horario_fim: '17:00',
      whatsapp_instance: 'renova-bh',
      cobra_consulta: true,
      valor_consulta: 120.00,
      chave_pix: '31999887766',
    },
  ];

  for (const c of clinicasData) {
    await pool.query(
      `INSERT INTO clinicas (id, nome, nome_dra, nome_atendente, instagram, tom, horario_inicio, horario_fim, whatsapp_instance, cobra_consulta, valor_consulta, chave_pix)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.nome, c.nome_dra, c.nome_atendente, c.instagram, c.tom, c.horario_inicio, c.horario_fim, c.whatsapp_instance, c.cobra_consulta, c.valor_consulta || null, c.chave_pix]
    );
  }
  console.log('[Seed] Clinicas inserted.');

  // Procedimentos
  const procedimentosData = [
    { id: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Botox', duracao_minutos: 45, valor_inteiro: 800.00, valor_parcelado: 900.00, parcelas: 3, publico_ideal: 'Mulheres 30-55 anos com linhas de expressao', contraindicacoes: 'Gravidez, aleitamento, doencas neuromusculares' },
    { id: 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Preenchimento Labial', duracao_minutos: 60, valor_inteiro: 1200.00, valor_parcelado: 1350.00, parcelas: 3, publico_ideal: 'Quem deseja labios mais volumosos e definidos', contraindicacoes: 'Herpes ativo, alergia a lidocaina' },
    { id: 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Harmonizacao Facial', duracao_minutos: 90, valor_inteiro: 2500.00, valor_parcelado: 2800.00, parcelas: 6, publico_ideal: 'Quem busca equilibrio e proporcao facial', contraindicacoes: 'Gravidez, uso de anticoagulantes' },
    { id: 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Botox', duracao_minutos: 45, valor_inteiro: 750.00, valor_parcelado: 850.00, parcelas: 3, publico_ideal: 'Adultos com rugas dinamicas', contraindicacoes: 'Gravidez, doencas neuromusculares' },
    { id: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Bichectomia', duracao_minutos: 60, valor_inteiro: 3500.00, valor_parcelado: 3900.00, parcelas: 6, publico_ideal: 'Quem deseja afinar o rosto', contraindicacoes: 'Problemas de coagulacao' },
    { id: 'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Skinbooster', duracao_minutos: 60, valor_inteiro: 1800.00, valor_parcelado: 2000.00, parcelas: 4, publico_ideal: 'Pele ressecada e sem vico', contraindicacoes: 'Alergia ao hialuronico' },
    { id: 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Botox', duracao_minutos: 45, valor_inteiro: 700.00, valor_parcelado: 800.00, parcelas: 3, publico_ideal: 'Mulheres e homens acima de 28 anos', contraindicacoes: 'Gravidez, lactacao' },
    { id: 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Lipo de Papada', duracao_minutos: 90, valor_inteiro: 4000.00, valor_parcelado: 4500.00, parcelas: 10, publico_ideal: 'Quem tem acumulo de gordura na papada', contraindicacoes: 'Diabetes nao controlada, tabagismo' },
    { id: 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Bioestimulador de Colageno', duracao_minutos: 60, valor_inteiro: 2200.00, valor_parcelado: 2500.00, parcelas: 5, publico_ideal: 'Flacidez moderada, perda de volume', contraindicacoes: 'Doencas autoimunes ativas' },
  ];

  for (const p of procedimentosData) {
    await pool.query(
      `INSERT INTO procedimentos (id, clinica_id, nome, duracao_minutos, valor_inteiro, valor_parcelado, parcelas, publico_ideal, contraindicacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.clinica_id, p.nome, p.duracao_minutos, p.valor_inteiro, p.valor_parcelado, p.parcelas, p.publico_ideal, p.contraindicacoes]
    );
  }
  console.log('[Seed] Procedimentos inserted.');

  // Procedimentos de Entrada
  const entradaData = [
    { id: 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Limpeza de Pele', valor_inteiro: 180.00, valor_parcelado: 200.00, parcelas: 2 },
    { id: 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Peeling Quimico', valor_inteiro: 250.00, valor_parcelado: 280.00, parcelas: 2 },
    { id: 'e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Microagulhamento', valor_inteiro: 350.00, valor_parcelado: 400.00, parcelas: 2 },
    { id: 'e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Laser CO2 Fracionado', valor_inteiro: 800.00, valor_parcelado: 900.00, parcelas: 3 },
    { id: 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Massagem Modeladora', valor_inteiro: 120.00, valor_parcelado: 140.00, parcelas: 2 },
    { id: 'e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Drenagem Linfatica', valor_inteiro: 100.00, valor_parcelado: 120.00, parcelas: 2 },
  ];

  for (const e of entradaData) {
    await pool.query(
      `INSERT INTO procedimentos_entrada (id, clinica_id, nome, valor_inteiro, valor_parcelado, parcelas)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [e.id, e.clinica_id, e.nome, e.valor_inteiro, e.valor_parcelado, e.parcelas]
    );
  }
  console.log('[Seed] Procedimentos de entrada inserted.');

  // Paciente Modelo
  const pacienteModeloData = [
    { id: 'f1111111-1111-1111-1111-111111111111', clinica_id: '11111111-1111-1111-1111-111111111111', valor_minimo_interesse: 800.00, procedimentos_ids: '{a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1,a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2}', descricao: 'Mulher 30-50 anos, classe A/B, preocupada com envelhecimento, busca resultados naturais e discretos' },
    { id: 'f2222222-2222-2222-2222-222222222222', clinica_id: '22222222-2222-2222-2222-222222222222', valor_minimo_interesse: 750.00, procedimentos_ids: '{b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1,b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2}', descricao: 'Adulto 25-45 anos, profissional bem-sucedido, valoriza qualidade e resultado' },
    { id: 'f3333333-3333-3333-3333-333333333333', clinica_id: '33333333-3333-3333-3333-333333333333', valor_minimo_interesse: 700.00, procedimentos_ids: '{c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1,c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3}', descricao: 'Mulher 28-50 anos, busca autoestima e bem-estar, sensivel a preco, parcela com facilidade' },
  ];

  for (const pm of pacienteModeloData) {
    await pool.query(
      `INSERT INTO paciente_modelo (id, clinica_id, valor_minimo_interesse, procedimentos_ids, descricao)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [pm.id, pm.clinica_id, pm.valor_minimo_interesse, pm.procedimentos_ids, pm.descricao]
    );
  }
  console.log('[Seed] Paciente modelo inserted.');

  // Leads
  const leadsData = [
    { id: '1ead0001-0000-0000-0000-000000000001', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Ana Paula Silva', telefone: '11991234001', email: 'ana.paula@email.com', status: 'novo', procedimento_interesse: 'Botox', score: 20 },
    { id: '1ead0002-0000-0000-0000-000000000002', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Beatriz Santos', telefone: '21991234002', status: 'novo', procedimento_interesse: 'Skinbooster', score: 10 },
    { id: '1ead0003-0000-0000-0000-000000000003', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Carlos Eduardo', telefone: '31991234003', status: 'novo', procedimento_interesse: 'Bioestimulador', score: 15 },
    { id: '1ead0004-0000-0000-0000-000000000004', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Daniela Rocha', telefone: '11991234004', email: 'dani@gmail.com', status: 'novo', procedimento_interesse: 'Harmonizacao Facial', score: 30 },
    { id: '1ead0005-0000-0000-0000-000000000005', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Eduarda Lima', telefone: '11991234005', email: 'edu@email.com', status: 'qualificacao', procedimento_interesse: 'Preenchimento Labial', score: 40 },
    { id: '1ead0006-0000-0000-0000-000000000006', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Fernanda Costa', telefone: '21991234006', status: 'qualificacao', procedimento_interesse: 'Botox', score: 35 },
    { id: '1ead0007-0000-0000-0000-000000000007', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Gabriela Mendes', telefone: '31991234007', email: 'gabi@email.com', status: 'qualificacao', procedimento_interesse: 'Botox', score: 38 },
    { id: '1ead0008-0000-0000-0000-000000000008', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Helena Ferreira', telefone: '11991234008', email: 'helena@email.com', status: 'qualificado', procedimento_interesse: 'Botox', score: 60 },
    { id: '1ead0009-0000-0000-0000-000000000009', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Isadora Pinto', telefone: '21991234009', email: 'isa@email.com', status: 'qualificado', procedimento_interesse: 'Bichectomia', score: 65 },
    { id: '1ead0010-0000-0000-0000-000000000010', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Julia Almeida', telefone: '31991234010', status: 'qualificado', procedimento_interesse: 'Lipo de Papada', score: 55 },
    { id: '1ead0011-0000-0000-0000-000000000011', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Karen Oliveira', telefone: '11991234011', email: 'karen@email.com', status: 'agendado', procedimento_interesse: 'Harmonizacao Facial', score: 80, data_agendamento: '2026-06-10', horario_agendamento: '10:00' },
    { id: '1ead0012-0000-0000-0000-000000000012', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Larissa Moura', telefone: '21991234012', email: 'larissa@email.com', status: 'agendado', procedimento_interesse: 'Botox', score: 75, data_agendamento: '2026-06-12', horario_agendamento: '14:00' },
    { id: '1ead0013-0000-0000-0000-000000000013', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Marina Souza', telefone: '11991234013', email: 'marina@email.com', status: 'convertido', procedimento_interesse: 'Preenchimento Labial', score: 95 },
    { id: '1ead0014-0000-0000-0000-000000000014', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Natalia Vieira', telefone: '31991234014', email: 'nat@email.com', status: 'convertido', procedimento_interesse: 'Botox', score: 90 },
    { id: '1ead0015-0000-0000-0000-000000000015', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Olivia Carvalho', telefone: '21991234015', status: 'followup', procedimento_interesse: 'Skinbooster', score: 45, follow_up_count: 2 },
    { id: '1ead0016-0000-0000-0000-000000000016', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Patricia Gomes', telefone: '31991234016', email: 'patricia@email.com', status: 'followup', procedimento_interesse: 'Bioestimulador de Colageno', score: 50, follow_up_count: 1 },
    { id: '1ead0017-0000-0000-0000-000000000017', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Quezia Barros', telefone: '11991234017', status: 'nutricao', procedimento_interesse: 'Botox', score: 25 },
    { id: '1ead0018-0000-0000-0000-000000000018', clinica_id: '22222222-2222-2222-2222-222222222222', nome: 'Renata Dias', telefone: '21991234018', email: 'renata@email.com', status: 'nutricao', procedimento_interesse: 'Bichectomia', score: 30 },
    { id: '1ead0019-0000-0000-0000-000000000019', clinica_id: '33333333-3333-3333-3333-333333333333', nome: 'Sabrina Torres', telefone: '31991234019', status: 'arquivado', procedimento_interesse: 'Lipo de Papada', score: 10, follow_up_count: 9 },
    { id: '1ead0020-0000-0000-0000-000000000020', clinica_id: '11111111-1111-1111-1111-111111111111', nome: 'Tatiane Neves', telefone: '11991234020', status: 'arquivado', procedimento_interesse: 'Harmonizacao Facial', score: 5, follow_up_count: 9 },
  ];

  for (const l of leadsData) {
    await pool.query(
      `INSERT INTO leads (id, clinica_id, nome, telefone, email, status, procedimento_interesse, score, data_agendamento, horario_agendamento, follow_up_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (clinica_id, telefone) DO NOTHING`,
      [l.id, l.clinica_id, l.nome, l.telefone, l.email || null, l.status, l.procedimento_interesse, l.score, l.data_agendamento || null, l.horario_agendamento || null, l.follow_up_count || 0]
    );
  }
  console.log('[Seed] Leads inserted.');

  // Mensagens - realistic WhatsApp conversations
  const conversas = [
    {
      lead_id: '1ead0001-0000-0000-0000-000000000001',
      clinica_id: '11111111-1111-1111-1111-111111111111',
      msgs: [
        { tipo: 'recebida', conteudo: 'Ola, vi o Instagram de voces e fiquei interessada no Botox. Como funciona?' },
        { tipo: 'enviada', conteudo: 'Ola Ana Paula! Que otimo que nos encontrou! O Botox e um procedimento minimamente invasivo que relaxa os musculos para suavizar rugas e linhas de expressao. Temos sessoes a partir de R$800.' },
        { tipo: 'recebida', conteudo: 'Quanto tempo dura o efeito?' },
        { tipo: 'enviada', conteudo: 'O efeito dura em media de 4 a 6 meses. A Dra. Isabela e especialista e os resultados sao sempre muito naturais!' },
        { tipo: 'recebida', conteudo: 'Que legal! Voces tem horario disponivel na proxima semana?' },
        { tipo: 'enviada', conteudo: 'Temos sim! Posso verificar a agenda. Qual seria o melhor periodo para voce - manha ou tarde?' },
      ]
    },
    {
      lead_id: '1ead0005-0000-0000-0000-000000000005',
      clinica_id: '11111111-1111-1111-1111-111111111111',
      msgs: [
        { tipo: 'recebida', conteudo: 'Oi! Quero saber sobre preenchimento labial' },
        { tipo: 'enviada', conteudo: 'Oi Eduarda! O preenchimento labial usa acido hialuronico para dar volume e definicao aos labios. Resultado imediato e muito natural!' },
        { tipo: 'recebida', conteudo: 'Doi muito?' },
        { tipo: 'enviada', conteudo: 'A Dra. Isabela aplica anestesia topica antes, entao o desconforto e minimo. A maioria das pacientes descreve como uma picadinha leve.' },
        { tipo: 'recebida', conteudo: 'Ok e o preco?' },
        { tipo: 'enviada', conteudo: 'O preenchimento labial e R$1.200 a vista ou 3x de R$450. Quer agendar uma avaliacao gratuita?' },
      ]
    },
    {
      lead_id: '1ead0008-0000-0000-0000-000000000008',
      clinica_id: '11111111-1111-1111-1111-111111111111',
      msgs: [
        { tipo: 'recebida', conteudo: 'Helena aqui. Quero fazer botox mas tenho medo de ficar com cara de plastico' },
        { tipo: 'enviada', conteudo: 'Entendo perfeitamente Helena! Na Bella Estetica, nosso objetivo e sempre o resultado mais natural possivel. A Dra. Isabela tem tecnica refinada para realcar sua beleza sem perder sua expressividade.' },
        { tipo: 'recebida', conteudo: 'Voce tem fotos de pacientes?' },
        { tipo: 'enviada', conteudo: 'Sim! No nosso Instagram @bellasteticasp temos varios antes e depois. Todos com consentimento das pacientes. Da uma olhada!' },
        { tipo: 'recebida', conteudo: 'Que legal! Quanto fica?' },
        { tipo: 'enviada', conteudo: 'Para botox completo sao R$800. Podemos parcelar em 3x sem juros. Quer que eu reserve um horario para avaliacao?' },
      ]
    },
    {
      lead_id: '1ead0011-0000-0000-0000-000000000011',
      clinica_id: '11111111-1111-1111-1111-111111111111',
      msgs: [
        { tipo: 'recebida', conteudo: 'Quero agendar harmonizacao facial' },
        { tipo: 'enviada', conteudo: 'Perfeito Karen! A harmonizacao facial e nosso procedimento mais completo. Vamos combinar botox, preenchimento e bioestimulador para um resultado incrivel!' },
        { tipo: 'recebida', conteudo: 'Qual o preco total?' },
        { tipo: 'enviada', conteudo: 'A harmonizacao completa fica em R$2.500 a vista ou ate 6x no cartao. Inclui avaliacao, procedimento e retorno de 15 dias.' },
        { tipo: 'recebida', conteudo: 'Ok vamos marcar para dia 10 as 10h' },
        { tipo: 'enviada', conteudo: 'Agendado! Dia 10/06 as 10h com a Dra. Isabela. Vou te enviar a confirmacao.' },
      ]
    },
    {
      lead_id: '1ead0009-0000-0000-0000-000000000009',
      clinica_id: '22222222-2222-2222-2222-222222222222',
      msgs: [
        { tipo: 'recebida', conteudo: 'Boa tarde! Tenho interesse em bichectomia' },
        { tipo: 'enviada', conteudo: 'Boa tarde Isadora! A bichectomia remove a bolsa de gordura bucal, afinando o rosto e realcando as macas do rosto.' },
        { tipo: 'recebida', conteudo: 'E cirurgia mesmo? Tem anestesia?' },
        { tipo: 'enviada', conteudo: 'Sim, e uma mini-cirurgia com anestesia local. Dura cerca de 1 hora e a recuperacao e tranquila. Na Clinica Aurora temos toda a estrutura necessaria!' },
        { tipo: 'recebida', conteudo: 'Qual o valor?' },
        { tipo: 'enviada', conteudo: 'A bichectomia e R$3.500 a vista ou ate 6x de R$650. Posso agendar uma consulta com a Dra. Camila?' },
      ]
    },
    {
      lead_id: '1ead0015-0000-0000-0000-000000000015',
      clinica_id: '22222222-2222-2222-2222-222222222222',
      msgs: [
        { tipo: 'recebida', conteudo: 'Oi quero saber sobre skinbooster' },
        { tipo: 'enviada', conteudo: 'Ola Olivia! O Skinbooster e uma tecnica de hidratacao profunda com microinjecoes de acido hialuronico. A pele fica visivelmente mais luminosa!' },
        { tipo: 'recebida', conteudo: 'Quanto custa?' },
        { tipo: 'enviada', conteudo: 'O Skinbooster e R$1.800 a vista ou 4x de R$500. Recomendamos 3 sessoes para resultado ideal.' },
        { tipo: 'recebida', conteudo: 'Vou pensar e volto a falar' },
        { tipo: 'enviada', conteudo: 'Claro Olivia! Qualquer duvida estou aqui. Temos pacote de 3 sessoes por R$4.800. Vale muito a pena!' },
      ]
    },
  ];

  for (const conv of conversas) {
    for (let i = 0; i < conv.msgs.length; i++) {
      const m = conv.msgs[i];
      const minutesAgo = (conv.msgs.length - i) * 5;
      await pool.query(
        `INSERT INTO mensagens (lead_id, clinica_id, conteudo, tipo, created_at)
         VALUES ($1, $2, $3, $4, NOW() - ($5 || ' minutes')::INTERVAL)`,
        [conv.lead_id, conv.clinica_id, m.conteudo, m.tipo, minutesAgo]
      );
    }
  }
  console.log('[Seed] Mensagens inserted.');

  // Agendamentos
  const agendamentosData = [
    { id: 'a9111111-1111-1111-1111-111111111111', lead_id: '1ead0011-0000-0000-0000-000000000011', clinica_id: '11111111-1111-1111-1111-111111111111', procedimento_id: 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', data: '2026-06-10', horario: '10:00', duracao_minutos: 90 },
    { id: 'a9222222-2222-2222-2222-222222222222', lead_id: '1ead0012-0000-0000-0000-000000000012', clinica_id: '22222222-2222-2222-2222-222222222222', procedimento_id: 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', data: '2026-06-12', horario: '14:00', duracao_minutos: 45 },
    { id: 'a9333333-3333-3333-3333-333333333333', lead_id: '1ead0013-0000-0000-0000-000000000013', clinica_id: '11111111-1111-1111-1111-111111111111', procedimento_id: 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', data: '2026-06-15', horario: '11:00', duracao_minutos: 60 },
  ];

  for (const ag of agendamentosData) {
    await pool.query(
      `INSERT INTO agendamentos (id, lead_id, clinica_id, procedimento_id, data, horario, duracao_minutos)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [ag.id, ag.lead_id, ag.clinica_id, ag.procedimento_id, ag.data, ag.horario, ag.duracao_minutos]
    );
  }
  console.log('[Seed] Agendamentos inserted.');

  console.log('[Seed] Done!');
  await pool.end();
}

seed().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
