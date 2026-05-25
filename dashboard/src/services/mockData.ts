import { Clinica, Lead, Mensagem, KanbanBoard, MetricasResumo, WhatsAppInstance } from '../types';

export const MOCK_CLINICAS: Clinica[] = [
  { id: 'c1', nome: 'Bella Estética SP', nome_dra: 'Dra. Marina Santos', nome_atendente: 'Sofia', instagram: '@bellastetica.sp', whatsapp_instance: 'bella-sp', created_at: '2024-01-15T10:00:00Z' },
  { id: 'c2', nome: 'Clínica Aurora RJ', nome_dra: 'Dra. Camila Rocha', nome_atendente: 'Bianca', instagram: '@clinicaaurora.rj', whatsapp_instance: 'aurora-rj', created_at: '2024-02-20T10:00:00Z' },
  { id: 'c3', nome: 'Instituto Renova BH', nome_dra: 'Dra. Fernanda Lima', nome_atendente: 'Laura', instagram: '@institutorenova.bh', created_at: '2024-03-10T10:00:00Z' },
];

export const MOCK_LEADS: Lead[] = [
  { id: 'l1', clinica_id: 'c1', nome: 'Ana Paula Ferreira', telefone: '11987654321', email: 'ana.paula@gmail.com', score: 85, status: 'qualificado', procedimento_interesse: 'Botox', data_contato: new Date(Date.now() - 86400000 * 2).toISOString(), follow_up_count: 0, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l2', clinica_id: 'c1', nome: 'Juliana Costa', telefone: '11976543210', score: 72, status: 'agendado', procedimento_interesse: 'Preenchimento Labial', data_contato: new Date(Date.now() - 86400000 * 5).toISOString(), data_agendamento: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], follow_up_count: 1, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l3', clinica_id: 'c1', nome: 'Mariana Oliveira', telefone: '11965432109', score: 45, status: 'qualificacao', procedimento_interesse: 'Harmonização Facial', data_contato: new Date(Date.now() - 86400000 * 1).toISOString(), follow_up_count: 0, bloqueado: false, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l4', clinica_id: 'c1', nome: 'Camila Rodrigues', telefone: '11954321098', score: 10, status: 'novo', data_contato: new Date().toISOString(), follow_up_count: 0, bloqueado: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'l5', clinica_id: 'c1', nome: 'Beatriz Almeida', telefone: '11943210987', score: 95, status: 'convertido', procedimento_interesse: 'Botox', data_contato: new Date(Date.now() - 86400000 * 10).toISOString(), follow_up_count: 2, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l6', clinica_id: 'c2', nome: 'Fernanda Silva', telefone: '21987654321', score: 38, status: 'followup', procedimento_interesse: 'Skinbooster', data_contato: new Date(Date.now() - 86400000 * 7).toISOString(), follow_up_count: 3, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 7).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l7', clinica_id: 'c2', nome: 'Gabriela Mendes', telefone: '21976543210', score: 22, status: 'nutricao', data_contato: new Date(Date.now() - 86400000 * 14).toISOString(), follow_up_count: 5, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 14).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l8', clinica_id: 'c2', nome: 'Larissa Pereira', telefone: '21965432109', score: 5, status: 'arquivado', data_contato: new Date(Date.now() - 86400000 * 20).toISOString(), follow_up_count: 9, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 20).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l9', clinica_id: 'c1', nome: 'Patricia Santos', telefone: '11932109876', score: 60, status: 'qualificado', procedimento_interesse: 'Fios de PDO', data_contato: new Date(Date.now() - 86400000 * 3).toISOString(), follow_up_count: 1, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l10', clinica_id: 'c1', nome: 'Renata Lima', telefone: '11921098765', score: 20, status: 'novo', data_contato: new Date().toISOString(), follow_up_count: 0, bloqueado: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'l11', clinica_id: 'c2', nome: 'Isabela Martins', telefone: '21954321098', score: 78, status: 'agendado', procedimento_interesse: 'Toxina Botulínica', data_contato: new Date(Date.now() - 86400000 * 4).toISOString(), data_agendamento: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], follow_up_count: 0, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 4).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l12', clinica_id: 'c3', nome: 'Vanessa Carvalho', telefone: '31987654321', score: 55, status: 'qualificacao', procedimento_interesse: 'Bioestimulador', data_contato: new Date(Date.now() - 86400000 * 2).toISOString(), follow_up_count: 0, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l13', clinica_id: 'c3', nome: 'Amanda Ferreira', telefone: '31976543210', score: 88, status: 'convertido', procedimento_interesse: 'Harmonização Facial', data_contato: new Date(Date.now() - 86400000 * 12).toISOString(), follow_up_count: 0, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 12).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l14', clinica_id: 'c3', nome: 'Carolina Nunes', telefone: '31965432109', score: 35, status: 'followup', data_contato: new Date(Date.now() - 86400000 * 8).toISOString(), follow_up_count: 4, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 8).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l15', clinica_id: 'c1', nome: 'Débora Castro', telefone: '11910987654', score: 15, status: 'nutricao', data_contato: new Date(Date.now() - 86400000 * 18).toISOString(), follow_up_count: 6, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 18).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l16', clinica_id: 'c2', nome: 'Helena Ribeiro', telefone: '21943210987', score: 3, status: 'arquivado', data_contato: new Date(Date.now() - 86400000 * 25).toISOString(), follow_up_count: 9, bloqueado: true, created_at: new Date(Date.now() - 86400000 * 25).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l17', clinica_id: 'c1', nome: 'Letícia Araújo', telefone: '11900876543', score: 67, status: 'qualificado', procedimento_interesse: 'Peeling', data_contato: new Date(Date.now() - 86400000 * 1).toISOString(), follow_up_count: 0, bloqueado: false, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l18', clinica_id: 'c3', nome: 'Monique Teixeira', telefone: '31954321098', score: 42, status: 'qualificacao', procedimento_interesse: 'Skinbooster', data_contato: new Date(Date.now() - 86400000 * 3).toISOString(), follow_up_count: 1, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l19', clinica_id: 'c1', nome: 'Nathalia Sousa', telefone: '11889765432', score: 30, status: 'novo', data_contato: new Date(Date.now() - 3600000).toISOString(), follow_up_count: 0, bloqueado: false, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'l20', clinica_id: 'c2', nome: 'Rafaela Barbosa', telefone: '21932109876', score: 91, status: 'convertido', procedimento_interesse: 'Fios de PDO', data_contato: new Date(Date.now() - 86400000 * 9).toISOString(), follow_up_count: 0, bloqueado: false, created_at: new Date(Date.now() - 86400000 * 9).toISOString(), updated_at: new Date().toISOString() },
];

export const MOCK_MENSAGENS: Record<string, Mensagem[]> = {
  l1: [
    { id: 'm1', lead_id: 'l1', conteudo: 'Olá! Vi o perfil de vocês no Instagram e fiquei curiosa sobre o botox', tipo: 'recebida', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'm2', lead_id: 'l1', conteudo: 'Oii Ana Paula! Que ótimo você entrar em contato! O botox é um dos nossos procedimentos mais populares aqui na Bella Estética', tipo: 'enviada', created_at: new Date(Date.now() - 86400000 * 2 + 300000).toISOString() },
    { id: 'm3', lead_id: 'l1', conteudo: 'Nunca fiz nenhum procedimento estético antes. Tenho um pouco de medo...', tipo: 'recebida', created_at: new Date(Date.now() - 86400000 * 2 + 600000).toISOString() },
    { id: 'm4', lead_id: 'l1', conteudo: 'É super normal ter esse receio! O botox é um procedimento minimamente invasivo, sem cortes, e a recuperação é imediata. A Dra. Marina tem anos de experiência e vai deixar você arrasando', tipo: 'enviada', created_at: new Date(Date.now() - 86400000 * 2 + 900000).toISOString() },
    { id: 'm5', lead_id: 'l1', conteudo: 'Que bom! E qual o valor?', tipo: 'recebida', created_at: new Date(Date.now() - 86400000 * 2 + 1200000).toISOString() },
    { id: 'm6', lead_id: 'l1', conteudo: 'O botox começa em R$ 800,00 a região. Posso te contar mais detalhes! Você mora em SP?', tipo: 'enviada', created_at: new Date(Date.now() - 86400000 * 2 + 1500000).toISOString() },
  ],
  l2: [
    { id: 'm7', lead_id: 'l2', conteudo: 'Boa tarde! Queria saber mais sobre preenchimento labial', tipo: 'recebida', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'm8', lead_id: 'l2', conteudo: 'Boa tarde Juliana! Adoro quando me falam sobre lábios. O preenchimento labial é um dos procedimentos que mais transforma o rosto!', tipo: 'enviada', created_at: new Date(Date.now() - 86400000 * 5 + 300000).toISOString() },
    { id: 'm9', lead_id: 'l2', conteudo: 'Tenho o lábio superior bem fininho. Quanto fica pra deixar mais volumoso?', tipo: 'recebida', created_at: new Date(Date.now() - 86400000 * 5 + 600000).toISOString() },
    { id: 'm10', lead_id: 'l2', conteudo: 'Para o lábio superior, normalmente utilizamos 0,5ml a 1ml de ácido hialurônico. O valor fica entre R$ 1.200 a R$ 1.500. Quando você pode vir?', tipo: 'enviada', created_at: new Date(Date.now() - 86400000 * 5 + 900000).toISOString() },
    { id: 'm11', lead_id: 'l2', conteudo: 'Essa semana tenho disponibilidade na quinta ou sexta!', tipo: 'recebida', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: 'm12', lead_id: 'l2', conteudo: 'Perfeito! Tenho uma vaga na quinta às 14h ou sexta às 10h. Qual prefere?', tipo: 'enviada', created_at: new Date(Date.now() - 86400000 * 4 + 300000).toISOString() },
    { id: 'm13', lead_id: 'l2', conteudo: 'Quinta às 14h está ótimo!', tipo: 'recebida', created_at: new Date(Date.now() - 86400000 * 4 + 600000).toISOString() },
    { id: 'm14', lead_id: 'l2', conteudo: 'Agendado! Quinta-feira às 14h com a Dra. Marina. Te mando o endereço da clínica. Estamos ansiosas para te receber!', tipo: 'enviada', created_at: new Date(Date.now() - 86400000 * 4 + 900000).toISOString() },
  ],
  l3: [
    { id: 'm15', lead_id: 'l3', conteudo: 'Oi! Quero saber sobre harmonização facial', tipo: 'recebida', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'm16', lead_id: 'l3', conteudo: 'Olá Mariana! A harmonização facial é uma combinação de procedimentos para equilibrar as proporções do rosto. Vamos te explicar melhor!', tipo: 'enviada', created_at: new Date(Date.now() - 86400000 + 300000).toISOString() },
  ],
  l6: [
    { id: 'm17', lead_id: 'l6', conteudo: 'Já falei com vocês semana passada, ainda quero fazer o skinbooster', tipo: 'recebida', created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: 'm18', lead_id: 'l6', conteudo: 'Fernanda, que bom ter você por aqui! Vamos verificar a disponibilidade da Dra. Camila para você.', tipo: 'enviada', created_at: new Date(Date.now() - 86400000 * 7 + 600000).toISOString() },
  ],
};

export const MOCK_KANBAN: KanbanBoard = {
  novo: MOCK_LEADS.filter(l => l.status === 'novo'),
  qualificacao: MOCK_LEADS.filter(l => l.status === 'qualificacao'),
  qualificado: MOCK_LEADS.filter(l => l.status === 'qualificado'),
  agendado: MOCK_LEADS.filter(l => l.status === 'agendado'),
  convertido: MOCK_LEADS.filter(l => l.status === 'convertido'),
  followup: MOCK_LEADS.filter(l => l.status === 'followup'),
  nutricao: MOCK_LEADS.filter(l => l.status === 'nutricao'),
  arquivado: MOCK_LEADS.filter(l => l.status === 'arquivado'),
};

export const MOCK_METRICAS: MetricasResumo = {
  total_leads: 20, leads_novos: 5, agendamentos: 3, taxa_conversao: 15,
  leads_por_status: { novo: 3, qualificacao: 4, qualificado: 3, agendado: 2, convertido: 3, followup: 2, nutricao: 2, arquivado: 1 },
};

export const MOCK_ATIVIDADE = Array.from({ length: 30 }, (_, i) => ({
  dia: new Date(Date.now() - 86400000 * (29 - i)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  leads: Math.floor(Math.random() * 8) + 1,
  agendados: Math.floor(Math.random() * 3),
}));

export const MOCK_AGENDAMENTOS_HOJE = [
  { id: 'ah1', paciente: 'Juliana Costa', procedimento: 'Preenchimento Labial', horario: '09:30', lead_id: 'l2', clinica: 'Bella Estética SP' },
  { id: 'ah2', paciente: 'Isabela Martins', procedimento: 'Toxina Botulínica', horario: '11:00', lead_id: 'l11', clinica: 'Clínica Aurora RJ' },
  { id: 'ah3', paciente: 'Amanda Ferreira', procedimento: 'Harmonização Facial', horario: '14:30', lead_id: 'l13', clinica: 'Instituto Renova BH' },
  { id: 'ah4', paciente: 'Ana Paula Ferreira', procedimento: 'Botox', horario: '16:00', lead_id: 'l1', clinica: 'Bella Estética SP' },
];

export const MOCK_TOP_PROCEDIMENTOS = [
  { procedimento: 'Botox', total_leads: 8, agendamentos: 3, conversao: 37.5 },
  { procedimento: 'Preenchimento Labial', total_leads: 5, agendamentos: 2, conversao: 40.0 },
  { procedimento: 'Harmonização Facial', total_leads: 4, agendamentos: 1, conversao: 25.0 },
  { procedimento: 'Skinbooster', total_leads: 3, agendamentos: 1, conversao: 33.3 },
  { procedimento: 'Bioestimulador', total_leads: 2, agendamentos: 0, conversao: 0.0 },
  { procedimento: 'Fios de PDO', total_leads: 2, agendamentos: 1, conversao: 50.0 },
];

export const MOCK_INSTANCIAS: WhatsAppInstance[] = [
  { id: 'w1', instance_name: 'bella-sp', phone_number: '+55 11 99999-0001', status: 'open', created_at: '2024-01-15T10:00:00Z' },
  { id: 'w2', instance_name: 'aurora-rj', phone_number: '+55 21 99999-0002', status: 'close', created_at: '2024-02-20T10:00:00Z' },
  { id: 'w3', instance_name: 'renova-bh', status: 'connecting', created_at: '2024-03-10T10:00:00Z' },
];
