import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Wifi, WifiOff, QrCode, Zap, Copy, Link2, Bot, BotOff, Calendar, CheckCircle, XCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '../services/api';
import { PageGlow } from '../components/ui/PageGlow';
import { useClinicaStore } from '../store/clinicaStore';

interface BaileysStatus {
  status: 'disconnected' | 'connecting' | 'connected';
  qr: string | null;
  phone: string | null;
  connected: boolean;
}

interface Clinica {
  id: string;
  nome: string;
  nome_dra?: string;
  ia_ativa: boolean;
  whatsapp_token: string;
  whatsapp_dra?: string;
  grupo_notificacao?: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    connected:    { label: 'Conectado',    color: 'bg-emerald-500/20 text-emerald-400' },
    connecting:   { label: 'Conectando',   color: 'bg-amber-500/20 text-amber-400' },
    disconnected: { label: 'Desconectado', color: 'bg-rose-500/20 text-rose-400' },
  };
  const s = map[status] || { label: status, color: 'bg-white/10 text-white/40' };
  return (
    <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full', s.color)}>
      {s.label}
    </span>
  );
}

// ─── Share link ───────────────────────────────────────────────────────────────

function ShareConnectionLink({ clinica }: { clinica: Clinica }) {
  const [copied, setCopied] = useState(false);

  // Use the public backend URL so the doctor can open from any device.
  // Set VITE_BACKEND_PUBLIC_URL in .env to your tunnel/cloud URL.
  // Fallback: strips /api suffix from VITE_API_URL if set, else uses localhost:3001.
  const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  const backendBase = (import.meta.env.VITE_BACKEND_PUBLIC_URL as string | undefined)
    || (rawApiUrl ? rawApiUrl.replace(/\/api\/?$/, '') : '')
    || 'http://localhost:3001';

  const link = `${backendBase}/connect/${clinica.whatsapp_token}`;
  const isLocalhost = backendBase.includes('localhost') || backendBase.includes('127.0.0.1');

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="mt-5 p-4 rounded-xl border border-brand-500/20 bg-brand-500/5">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={14} className="text-brand-400" />
        <p className="text-xs font-semibold text-brand-400">Link de conexão para {clinica.nome}</p>
      </div>
      <p className="text-xs text-white/40 mb-3 leading-relaxed">
        Envie este link para a Dra. Ela abre no celular e escaneia o QR — sem precisar de login.
      </p>
      {isLocalhost && (
        <div className="mb-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-400 leading-relaxed">
            ⚠️ Este link usa <strong>localhost</strong> — só funciona neste computador.
            Para compartilhar com a Dra., configure um tunnel (Cloudflare/ngrok) e defina
            <code className="mx-1 px-1 bg-white/10 rounded text-amber-300">VITE_BACKEND_PUBLIC_URL</code>
            no <code className="px-1 bg-white/10 rounded text-amber-300">.env</code>.
          </p>
        </div>
      )}
      <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2">
        <span className="flex-1 text-xs text-white/50 truncate font-mono">{link}</span>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors flex-shrink-0"
          style={{ color: copied ? '#10b981' : '#8b5cf6' }}
        >
          <Copy size={12} />
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}

// ─── Baileys Panel ────────────────────────────────────────────────────────────

function BaileysPanel({ clinica }: { clinica: Clinica }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<BaileysStatus>({
    queryKey: ['baileys-status', clinica.id],
    queryFn: () => api.get(`/baileys/status?clinica_id=${clinica.id}`).then(r => r.data),
    refetchInterval: (query) => {
      const d = query.state.data;
      return d?.status === 'connecting' ? 3000 : d?.status === 'connected' ? 15000 : 5000;
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: () => api.post('/baileys/reconnect', { clinica_id: clinica.id }),
    onSuccess: () => {
      toast.success('Aguarde o novo QR Code...');
      setTimeout(() => qc.invalidateQueries({ queryKey: ['baileys-status', clinica.id] }), 2000);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.post('/baileys/disconnect', { clinica_id: clinica.id }),
    onSuccess: () => {
      toast.success('Desconectado');
      qc.invalidateQueries({ queryKey: ['baileys-status', clinica.id] });
    },
  });

  const iaMutation = useMutation({
    mutationFn: () => api.patch(`/clinicas/${clinica.id}/toggle-ia`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['clinica-detail', clinica.id] });
      qc.invalidateQueries({ queryKey: ['clinicas-list'] });
      toast.success(res.data.ia_ativa ? 'IA reativada para esta clínica' : 'IA pausada para toda esta clínica');
    },
  });

  // Fetch current ia_ativa state
  const { data: clinicaData } = useQuery<Clinica>({
    queryKey: ['clinica-detail', clinica.id],
    queryFn: () => api.get(`/clinicas/${clinica.id}`).then(r => r.data),
  });
  const iaAtiva = clinicaData?.ia_ativa ?? clinica.ia_ativa ?? true;

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
          <Zap size={18} className="text-brand-400" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-white">Baileys — WhatsApp Local</h3>
          <p className="text-xs text-white/30 mt-0.5">Conexão direta via QR code • sem VPS necessário</p>
        </div>
        <div className="ml-auto">
          {data && <StatusBadge status={data.connected ? 'connected' : data.status === 'connecting' ? 'connecting' : 'disconnected'} />}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <RefreshCw size={24} className="text-brand-500 animate-spin" />
        </div>
      )}

      {/* QR Code */}
      {!isLoading && data?.status === 'connecting' && (
        <div className="flex flex-col items-center gap-4 py-4">
          {data.qr ? (
            <>
              <div className="p-3 bg-white rounded-2xl shadow-2xl">
                <img src={data.qr} alt="QR Code WhatsApp" className="w-56 h-56 rounded-lg" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-white">Escaneie com seu WhatsApp</p>
                <p className="text-xs text-white/40">Abra o WhatsApp → <span className="text-white/60">⋮</span> → Aparelhos conectados → Conectar aparelho</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <RefreshCw size={32} className="text-brand-400 animate-spin" />
              <p className="text-sm text-white/50">Gerando QR Code...</p>
            </div>
          )}
        </div>
      )}

      {/* Connected */}
      {!isLoading && data?.connected && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Wifi size={28} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white font-display">WhatsApp Conectado</p>
            {data.phone && <p className="text-sm text-white/40 mt-1">+{data.phone}</p>}
            <p className="text-xs text-emerald-400 mt-2">
              {iaAtiva ? 'Recebendo e respondendo com IA' : 'Recebendo mensagens — IA pausada'}
            </p>
          </div>
          <button
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="mt-2 px-4 py-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-sm transition-colors"
          >
            Desconectar
          </button>
        </div>
      )}

      {/* Disconnected */}
      {!isLoading && !data?.connected && data?.status !== 'connecting' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <WifiOff size={28} className="text-white/30" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-white/60">Desconectado</p>
            <p className="text-xs text-white/30 mt-1">Clique em conectar para gerar o QR code</p>
          </div>
          <button
            onClick={() => reconnectMutation.mutate()}
            disabled={reconnectMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {reconnectMutation.isPending ? <RefreshCw size={15} className="animate-spin" /> : <QrCode size={15} />}
            Conectar WhatsApp
          </button>
        </div>
      )}

      {/* Reconnect button when connecting */}
      {!isLoading && data?.status === 'connecting' && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => reconnectMutation.mutate()}
            disabled={reconnectMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-brand-400 transition-colors"
          >
            <RefreshCw size={12} /> Gerar novo QR
          </button>
        </div>
      )}

      {/* Global IA toggle */}
      <div className="mt-6 pt-5 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/70">IA Automática</p>
            <p className="text-xs text-white/30 mt-0.5">Pausar para toda esta clínica</p>
          </div>
          <button
            onClick={() => iaMutation.mutate()}
            disabled={iaMutation.isPending}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-colors',
              iaAtiva
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
            )}
          >
            {iaAtiva ? <><Bot size={13} /> IA Ativa</> : <><BotOff size={13} /> IA Pausada</>}
          </button>
        </div>
        {!iaAtiva && (
          <p className="text-xs text-amber-400/60 mt-2">
            Nenhuma mensagem será respondida automaticamente até você reativar.
          </p>
        )}
      </div>

      {/* Share link */}
      {clinica.whatsapp_token && <ShareConnectionLink clinica={clinica} />}

      {/* Info */}
      <div className="mt-4 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
        <p className="text-xs text-white/30 leading-relaxed">
          <span className="text-white/50 font-medium">Baileys</span> conecta diretamente ao WhatsApp Web.
          Mensagens recebidas são respondidas automaticamente pela IA Groq.
          Leads são criados e pontuados em tempo real no CRM.
        </p>
      </div>
    </div>
  );
}

// ─── Grupo de Notificação ─────────────────────────────────────────────────────

function GrupoNotificacaoPanel({ clinica }: { clinica: Clinica }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(clinica.whatsapp_dra ?? '');
  const [saving, setSaving] = useState(false);

  const hasGroup = !!clinica.grupo_notificacao;

  const createGroupMutation = useMutation({
    mutationFn: () => api.post('/baileys/create-group', { clinica_id: clinica.id }),
    onSuccess: () => {
      toast.success('Grupo criado! Verifique o WhatsApp da Dra. 🌸');
      qc.invalidateQueries({ queryKey: ['clinica-detail', clinica.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erro ao criar grupo'),
  });

  async function savePhone() {
    if (!phone.trim()) return;
    setSaving(true);
    try {
      await api.put(`/clinicas/${clinica.id}`, { whatsapp_dra: phone.trim() });
      toast.success('Número salvo');
      qc.invalidateQueries({ queryKey: ['clinica-detail', clinica.id] });
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  }

  return (
    <div className="card p-6 mt-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <Users size={18} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-white">Grupo de Notificações</h3>
          <p className="text-xs text-white/30 mt-0.5">Agendamentos e relatório diário às 20h no WhatsApp</p>
        </div>
        <div className="ml-auto">
          {hasGroup
            ? <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-medium"><CheckCircle size={12} /> Grupo ativo</span>
            : <span className="flex items-center gap-1.5 text-xs text-white/30 bg-white/5 px-2.5 py-1 rounded-full font-medium"><XCircle size={12} /> Sem grupo</span>
          }
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">WhatsApp da {clinica.nome_dra ?? 'Dra.'} (com DDD)</label>
          <div className="flex gap-2">
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ex: 51999887766"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50"
            />
            <button
              onClick={savePhone}
              disabled={saving || !phone.trim()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors disabled:opacity-40"
            >
              {saving ? '...' : 'Salvar'}
            </button>
          </div>
          <p className="text-xs text-white/25 mt-1.5">Somente números, sem espaços ou traços. Ex: 51999887766</p>
        </div>

        {hasGroup ? (
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
            <p className="text-xs text-emerald-400/80 leading-relaxed">
              ✅ Grupo criado. A IA enviará notificações de agendamento e o relatório diário às 20h neste grupo.
            </p>
          </div>
        ) : (
          <button
            onClick={() => createGroupMutation.mutate()}
            disabled={createGroupMutation.isPending || !clinica.whatsapp_dra}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-40 w-full justify-center"
          >
            {createGroupMutation.isPending
              ? <><RefreshCw size={14} className="animate-spin" /> Criando grupo...</>
              : <><Users size={14} /> Criar grupo no WhatsApp</>
            }
          </button>
        )}

        {!clinica.whatsapp_dra && (
          <p className="text-xs text-amber-400/70">Salve o WhatsApp da Dra. acima antes de criar o grupo.</p>
        )}
      </div>
    </div>
  );
}

// ─── Google Calendar Panel ────────────────────────────────────────────────────

function GoogleCalendarPanel({ clinicaId }: { clinicaId: string }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ connected: boolean }>({
    queryKey: ['google-status', clinicaId],
    queryFn: () => api.get(`/google/status?clinica_id=${clinicaId}`).then(r => r.data),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete(`/google/disconnect?clinica_id=${clinicaId}`),
    onSuccess: () => {
      toast.success('Google Calendar desconectado');
      qc.invalidateQueries({ queryKey: ['google-status', clinicaId] });
    },
  });

  function connectGoogle() {
    window.open(`/api/google/auth?clinica_id=${clinicaId}`, '_blank', 'width=520,height=620');
    // Poll for connection after popup closes
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['google-status', clinicaId] });
    }, 3000);
    setTimeout(() => clearInterval(interval), 120000);
  }

  return (
    <div className="card p-6 mt-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Calendar size={18} className="text-blue-400" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-white">Google Calendar</h3>
          <p className="text-xs text-white/30 mt-0.5">Cria eventos automaticamente ao agendar paciente</p>
        </div>
        <div className="ml-auto">
          {!isLoading && (
            data?.connected
              ? <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-medium"><CheckCircle size={12} /> Conectado</span>
              : <span className="flex items-center gap-1.5 text-xs text-white/30 bg-white/5 px-2.5 py-1 rounded-full font-medium"><XCircle size={12} /> Desconectado</span>
          )}
        </div>
      </div>

      {data?.connected ? (
        <div className="space-y-3">
          <p className="text-xs text-white/40 leading-relaxed">
            Quando um lead for movido para <span className="text-brand-400 font-medium">Agendado</span>, um evento será criado automaticamente no Google Calendar com o nome do paciente e o procedimento.
          </p>
          <button
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="text-xs text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/20 px-3 py-1.5 rounded-lg hover:bg-rose-500/10"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-white/40 leading-relaxed">
            Conecte o Google Calendar da Dra. para criar agendamentos automaticamente quando um paciente for marcado como <span className="text-brand-400 font-medium">Agendado</span>.
          </p>
          <button
            onClick={connectGoogle}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
          >
            <Calendar size={14} /> Conectar Google Calendar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const { selectedId } = useClinicaStore();

  const { data: clinicaData, isLoading } = useQuery<Clinica>({
    queryKey: ['clinica-detail', selectedId],
    queryFn: () => api.get(`/clinicas/${selectedId}`).then(r => r.data),
    enabled: !!selectedId,
  });

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      <PageGlow />
      <div className="relative p-8" style={{ zIndex: 1 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">WhatsApp</h2>
            <p className="text-white/40 text-sm mt-1">
              {clinicaData?.nome ?? 'Selecione uma clínica'} — conecte o número e ative a IA
            </p>
          </div>
        </div>

        {!selectedId && (
          <div className="text-center py-20 text-white/30">
            Selecione uma clínica na sidebar para gerenciar o WhatsApp
          </div>
        )}

        {selectedId && isLoading && (
          <div className="flex justify-center py-20">
            <RefreshCw size={24} className="text-brand-400 animate-spin" />
          </div>
        )}

        {selectedId && clinicaData && (
          <div className="max-w-xl">
            <BaileysPanel clinica={clinicaData} />
            <GrupoNotificacaoPanel clinica={clinicaData} />
            <GoogleCalendarPanel clinicaId={selectedId} />
          </div>
        )}
      </div>
    </div>
  );
}
