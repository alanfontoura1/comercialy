import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock, ChevronDown, Pencil, Trash2, Check, X,
  BotOff, Bot, Sparkles, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '../services/api';
import { PageGlow } from '../components/ui/PageGlow';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { useClinicaStore } from '../store/clinicaStore';
import { Lead, LeadStatus } from '../types';
import { displayName, formatPhone } from '../utils/format';

const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo', qualificacao: 'Qualificação', qualificado: 'Qualificado',
  agendado: 'Agendado', convertido: 'Convertido', followup: 'Follow-up',
  nutricao: 'Nutrição', arquivado: 'Arquivado',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-gray-500/20 text-gray-400',
  qualificacao: 'bg-amber-500/20 text-amber-400',
  qualificado: 'bg-blue-500/20 text-blue-400',
  agendado: 'bg-brand-500/20 text-brand-400',
  convertido: 'bg-emerald-500/20 text-emerald-400',
  followup: 'bg-orange-500/20 text-orange-400',
  nutricao: 'bg-pink-500/20 text-pink-400',
  arquivado: 'bg-gray-700/40 text-gray-500',
};

const ALL_STATUSES: LeadStatus[] = ['novo', 'qualificacao', 'qualificado', 'agendado', 'convertido', 'followup', 'nutricao', 'arquivado'];

interface Msg { id: string; conteudo: string; tipo: 'enviada' | 'recebida' | 'sistema'; created_at: string; }

interface Analysis {
  score: number | null;
  resumo: string | null;
  pontos_positivos: string[];
  pontos_melhoria: { regra: string; ocorreu: string; deveria: string; exemplo: string }[];
  created_at?: string;
}

function Avatar({ nome }: { nome?: string }) {
  const initials = nome
    ? nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?';
  return (
    <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-brand-400">{initials}</span>
    </div>
  );
}

// ─── Analysis Panel ──────────────────────────────────────────────────────────

function AnalysisPanel({ leadId }: { leadId: string }) {
  const qc = useQueryClient();

  const { data: analysis, isLoading: loadingAnalysis } = useQuery<Analysis>({
    queryKey: ['analysis', leadId],
    queryFn: () => api.get(`/leads/${leadId}/analysis`).then(r => r.data),
    enabled: !!leadId,
  });

  const runMutation = useMutation({
    mutationFn: () => api.post(`/leads/${leadId}/analysis`),
    onSuccess: (res) => {
      qc.setQueryData(['analysis', leadId], res.data);
      toast.success('Análise concluída!');
    },
    onError: () => toast.error('Erro ao analisar conversa'),
  });

  const hasAnalysis = analysis?.score !== null && analysis?.score !== undefined;
  const score = analysis?.score ?? 0;

  return (
    <div className="border-t border-white/[0.06] pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-brand-400" />
          <p className="text-xs font-semibold text-white/70">Análise da Conversa</p>
        </div>
        <button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} className={clsx(runMutation.isPending && 'animate-spin')} />
          {hasAnalysis ? 'Reanalisar' : 'Analisar'}
        </button>
      </div>

      {runMutation.isPending && (
        <div className="text-center py-4">
          <RefreshCw size={18} className="mx-auto animate-spin text-brand-400 mb-2" />
          <p className="text-xs text-white/30">IA analisando a conversa...</p>
        </div>
      )}

      {!runMutation.isPending && hasAnalysis && (
        <div className="space-y-3">
          {/* Score */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="text-center">
              <p className={clsx(
                'text-2xl font-bold font-display',
                score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400'
              )}>{score}</p>
              <p className="text-xs text-white/30">/ 100</p>
            </div>
            <div>
              <p className="text-xs font-medium text-white/60 mb-0.5">
                {score >= 70 ? 'Bom atendimento' : score >= 40 ? 'Pode melhorar' : 'Precisa de ajustes'}
              </p>
              <p className="text-xs text-white/35 leading-relaxed">{analysis?.resumo}</p>
            </div>
          </div>

          {/* Positive points */}
          {(analysis?.pontos_positivos?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-emerald-400/70 mb-1.5 flex items-center gap-1">
                <CheckCircle2 size={11} /> Pontos positivos
              </p>
              <ul className="space-y-1">
                {analysis!.pontos_positivos.map((p, i) => (
                  <li key={i} className="text-xs text-white/45 flex gap-1.5">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvement points */}
          {(analysis?.pontos_melhoria?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-amber-400/70 mb-2 flex items-center gap-1">
                <AlertTriangle size={11} /> Pontos de melhoria
              </p>
              <div className="space-y-2">
                {analysis!.pontos_melhoria.map((p, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <p className="text-xs font-semibold text-amber-400/80 mb-1">{p.regra}</p>
                    <p className="text-xs text-white/35 mb-1">{p.ocorreu}</p>
                    <p className="text-xs text-white/50 mb-1.5">{p.deveria}</p>
                    {p.exemplo && (
                      <div className="bg-white/[0.04] rounded-lg px-2.5 py-1.5 border border-white/[0.06]">
                        <p className="text-xs text-brand-300 italic">"{p.exemplo}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis?.created_at && (
            <p className="text-xs text-white/20">
              Analisado {formatDistanceToNow(new Date(analysis.created_at), { locale: ptBR, addSuffix: true })}
            </p>
          )}
        </div>
      )}

      {!runMutation.isPending && !hasAnalysis && (
        <div className="text-center py-3">
          <TrendingUp size={20} className="mx-auto text-white/20 mb-2" />
          <p className="text-xs text-white/30">Clique em "Analisar" para avaliar a conversa com IA</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConversasPage() {
  const [searchParams] = useSearchParams();
  const leadParam = searchParams.get('lead');
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedId: clinicaId } = useClinicaStore();

  const [selectedId, setSelectedId] = useState<string>(leadParam ?? '');
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({ nome: '', email: '', telefone: '' });

  // Load leads from API
  const { data: leadsData } = useQuery<{ data: Lead[] }>({
    queryKey: ['leads', clinicaId],
    queryFn: () => api.get(`/leads?${clinicaId ? `clinica_id=${clinicaId}&` : ''}limit=200`).then(r => r.data),
    enabled: !!clinicaId,
    refetchInterval: 8000,
  });

  const leads = leadsData?.data ?? [];
  const selectedLead = leads.find(l => l.id === selectedId);

  // Load messages for selected lead
  const { data: msgsData, refetch: refetchMsgs } = useQuery<{ data: Msg[] }>({
    queryKey: ['mensagens', selectedId],
    queryFn: () => api.get(`/leads/${selectedId}/mensagens?limit=100`).then(r => r.data),
    enabled: !!selectedId,
    refetchInterval: 5000,
  });
  const messages = msgsData?.data ?? [];

  // Auto-select first lead
  useEffect(() => {
    if (!selectedId && leads.length > 0) {
      setSelectedId(leadParam ?? leads[0].id);
    }
  }, [leads]);

  // Navigate from Kanban
  useEffect(() => {
    if (leadParam && leads.find(l => l.id === leadParam)) {
      setSelectedId(leadParam);
    }
  }, [leadParam, leads]);

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Populate edit fields
  useEffect(() => {
    if (editMode && selectedLead) {
      setEditFields({
        nome: selectedLead.nome ?? '',
        email: (selectedLead as any).email ?? '',
        telefone: selectedLead.telefone,
      });
    }
  }, [editMode, selectedLead?.id]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (fields: Partial<Lead>) => api.patch(`/leads/${selectedId}`, fields),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead atualizado'); setEditMode(false); },
    onError: () => toast.error('Erro ao atualizar lead'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.patch(`/leads/${selectedId}`, { status: 'arquivado' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      const remaining = leads.filter(l => l.id !== selectedId);
      setSelectedId(remaining[0]?.id ?? '');
      toast.success('Lead arquivado');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: LeadStatus) => api.patch(`/leads/${selectedId}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); setShowMoveDropdown(false); },
  });

  const bloquearMutation = useMutation({
    mutationFn: () => api.patch(`/leads/${selectedId}/bloquear`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); },
  });

  const iaPausaMutation = useMutation({
    mutationFn: () => api.patch(`/leads/${selectedId}/ia-pausa`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      const paused = res.data.ia_pausada;
      toast.success(paused ? 'IA pausada para este lead' : 'IA reativada');
    },
  });

  function handleSaveEdit() {
    updateMutation.mutate(editFields);
  }

  function handleDelete() {
    if (!window.confirm(`Arquivar lead "${selectedLead ? displayName(selectedLead.nome, selectedLead.telefone) : ''}"?`)) return;
    deleteMutation.mutate();
  }

  function getLastMsg(leadId: string) {
    // Use messages from cache or return null
    return null;
  }

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-white/30">
        Nenhum lead encontrado.
      </div>
    );
  }

  const iaPausada = (selectedLead as any)?.ia_pausada;

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      <PageGlow />
      <div className="relative flex h-screen" style={{ zIndex: 1 }}>

        {/* Left panel — lead list */}
        <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="px-4 py-4 border-b border-white/[0.06]">
            <h2 className="font-display font-bold text-white text-base">Conversas</h2>
            <p className="text-xs text-white/30 mt-0.5">{leads.length} leads</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {leads.map(lead => {
              const isActive = lead.id === selectedId;
              return (
                <button
                  key={lead.id}
                  onClick={() => { setSelectedId(lead.id); setEditMode(false); }}
                  className={clsx(
                    'w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors flex items-start gap-3',
                    isActive ? 'bg-brand-500/10' : 'hover:bg-white/[0.02]'
                  )}
                >
                  <Avatar nome={lead.nome ?? displayName(lead.nome, lead.telefone)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-white truncate">{displayName(lead.nome, lead.telefone)}</span>
                      <ScoreBadge score={lead.score} />
                    </div>
                    <p className="text-xs text-white/30 truncate">{formatPhone(lead.telefone) || lead.telefone}</p>
                    <p className="text-xs text-white/20 mt-1">
                      {formatDistanceToNow(new Date(lead.data_contato || lead.created_at || new Date()), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center — chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <Avatar nome={selectedLead ? displayName(selectedLead.nome, selectedLead.telefone) : undefined} />
            <div>
              <p className="font-semibold text-white text-sm">{selectedLead ? displayName(selectedLead.nome, selectedLead.telefone) : ''}</p>
              <p className="text-xs text-white/30">{formatPhone(selectedLead?.telefone) || selectedLead?.telefone}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {iaPausada && (
                <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                  <BotOff size={11} /> IA pausada
                </span>
              )}
              {selectedLead?.bloqueado && (
                <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">
                  <Lock size={11} /> Bloqueado
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-white/20 text-sm">
                Nenhuma mensagem ainda
              </div>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={clsx('flex', msg.tipo === 'enviada' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={clsx(
                    'max-w-xs lg:max-w-md px-3 py-2 rounded-xl text-sm',
                    msg.tipo === 'enviada'
                      ? 'rounded-br-none text-white'
                      : 'bg-white/[0.07] text-white/80 rounded-bl-none'
                  )}
                  style={msg.tipo === 'enviada' ? { background: '#8b5cf6' } : undefined}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.conteudo}</p>
                  <p className={clsx('text-xs mt-1', msg.tipo === 'enviada' ? 'text-white/50' : 'text-white/30')}>
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-6 py-4 border-t border-white/[0.06]">
            {iaPausada && (
              <p className="text-xs text-amber-400/70 mb-2 text-center">
                IA pausada — monitore ou responda manualmente abaixo
              </p>
            )}
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5">
              <input
                type="text"
                placeholder={iaPausada ? 'Resposta manual (em breve)...' : 'IA respondendo automaticamente...'}
                className="flex-1 bg-transparent text-sm text-white/70 placeholder-white/25 focus:outline-none"
                readOnly
              />
              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-white opacity-40 cursor-not-allowed" style={{ background: '#8b5cf6' }}>
                Enviar
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — lead info */}
        <div className="w-64 flex-shrink-0 border-l border-white/[0.06] p-4 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white text-sm">Info do Lead</h3>
            <div className="flex items-center gap-1">
              {editMode ? (
                <>
                  <button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                    <Check size={13} />
                  </button>
                  <button onClick={() => setEditMode(false)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-colors">
                    <X size={13} />
                  </button>
                </>
              ) : (
                <button onClick={() => setEditMode(true)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-brand-500/15 hover:text-brand-400 transition-colors">
                  <Pencil size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="card p-4 mb-4 text-center">
            <p className="text-xs text-white/40 mb-1">Score</p>
            <p className={clsx(
              'text-3xl font-bold font-display',
              (selectedLead?.score ?? 0) >= 70 ? 'text-emerald-400' :
              (selectedLead?.score ?? 0) >= 40 ? 'text-amber-400' : 'text-rose-400'
            )}>
              {selectedLead?.score ?? 0}
            </p>
          </div>

          {/* Status */}
          <div className="mb-4">
            <p className="text-xs text-white/30 mb-1.5">Status atual</p>
            <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full', STATUS_COLORS[selectedLead?.status as LeadStatus ?? 'novo'])}>
              {STATUS_LABELS[selectedLead?.status as LeadStatus ?? 'novo']}
            </span>
          </div>

          {/* Fields */}
          <div className="space-y-3 mb-5">
            {editMode ? (
              <>
                {[
                  { label: 'Nome', field: 'nome' as const, placeholder: 'Nome completo' },
                  { label: 'Telefone', field: 'telefone' as const, placeholder: '11999999999' },
                  { label: 'Email', field: 'email' as const, placeholder: 'email@exemplo.com' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <p className="text-xs text-white/30 mb-1">{label}</p>
                    <input
                      value={editFields[field]}
                      onChange={e => setEditFields(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40"
                    />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { label: 'Nome', value: selectedLead?.nome },
                  { label: 'Telefone', value: selectedLead?.telefone },
                  { label: 'Email', value: (selectedLead as any)?.email },
                  { label: 'Procedimento', value: selectedLead?.procedimento_interesse },
                  { label: 'Contato', value: selectedLead?.data_contato ? formatDistanceToNow(new Date(selectedLead.data_contato), { locale: ptBR, addSuffix: true }) : undefined },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-white/30">{label}</p>
                    <p className="text-sm text-white/70 mt-0.5">{value ?? '—'}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="relative">
              <button
                onClick={() => setShowMoveDropdown(v => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 rounded-lg text-xs text-brand-400 font-medium transition-colors"
              >
                Mover no Kanban
                <ChevronDown size={12} />
              </button>
              {showMoveDropdown && (
                <div className="absolute bottom-full left-0 right-0 mb-1 card shadow-xl z-10">
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => statusMutation.mutate(s)}
                      className="w-full text-left px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pause AI */}
            <button
              onClick={() => iaPausaMutation.mutate()}
              disabled={iaPausaMutation.isPending}
              className={clsx(
                'w-full flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors',
                iaPausada
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400'
              )}
            >
              {iaPausada ? <><Bot size={12} /> Reativar IA</> : <><BotOff size={12} /> Pausar IA</>}
            </button>

            <button
              onClick={() => bloquearMutation.mutate()}
              className="w-full px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-xs text-rose-400 font-medium transition-colors"
            >
              {selectedLead?.bloqueado ? 'Desbloquear Lead' : 'Bloquear Lead'}
            </button>

            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/20 rounded-lg text-xs text-white/30 hover:text-rose-400 font-medium transition-colors"
            >
              <Trash2 size={12} /> Arquivar Lead
            </button>
          </div>

          {/* Analysis panel */}
          {selectedId && <AnalysisPanel leadId={selectedId} />}
        </div>
      </div>
    </div>
  );
}
