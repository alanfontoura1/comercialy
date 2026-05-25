export interface Clinica {
  id: string; nome: string; nome_dra?: string; nome_atendente?: string;
  instagram?: string; whatsapp_instance?: string; created_at: string;
}

export interface Procedimento {
  id: string; clinica_id: string; nome: string; duracao_minutos: number;
  valor_inteiro?: number; valor_parcelado?: number; parcelas?: number;
  publico_ideal?: string; contraindicacoes?: string; ativo: boolean;
}

export type LeadStatus = 'novo' | 'qualificacao' | 'qualificado' | 'agendado' | 'convertido' | 'followup' | 'nutricao' | 'arquivado';

export interface Lead {
  id: string; clinica_id: string; nome?: string; telefone: string; email?: string;
  score: number; status: LeadStatus; procedimento_interesse?: string;
  data_contato: string; data_agendamento?: string; follow_up_count: number;
  bloqueado: boolean; created_at: string; updated_at: string;
}

export interface Mensagem {
  id: string; lead_id: string; conteudo: string;
  tipo: 'enviada' | 'recebida' | 'sistema'; created_at: string;
}

export interface KanbanBoard {
  novo: Lead[]; qualificacao: Lead[]; qualificado: Lead[];
  agendado: Lead[]; convertido: Lead[]; followup: Lead[];
  nutricao: Lead[]; arquivado: Lead[];
}

export interface Agendamento {
  id: string; lead_id: string; clinica_id: string; procedimento_id?: string;
  data: string; horario: string; duracao_minutos: number;
  google_event_id?: string; consulta_paga: boolean; created_at: string;
}

export interface MetricasResumo {
  total_leads: number; leads_novos: number; agendamentos: number;
  taxa_conversao: number; leads_por_status: Record<LeadStatus, number>;
}

export interface WhatsAppInstance {
  id: string; instance_name: string; phone_number?: string;
  status: string; created_at: string;
}
