import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, CalendarCheck, TrendingUp, UserPlus, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageGlow } from '../components/ui/PageGlow';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { useAuthStore } from '../store/authStore';
import { useClinicaStore } from '../store/clinicaStore';
import api from '../services/api';
import clsx from 'clsx';

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo', qualificacao: 'Qualificação', qualificado: 'Qualificado',
  agendado: 'Agendado', convertido: 'Convertido', followup: 'Follow-up',
  nutricao: 'Nutrição', arquivado: 'Arquivado',
};

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-gray-500/20 text-gray-400',
  qualificacao: 'bg-amber-500/20 text-amber-400',
  qualificado: 'bg-blue-500/20 text-blue-400',
  agendado: 'bg-brand-500/20 text-brand-400',
  convertido: 'bg-emerald-500/20 text-emerald-400',
  followup: 'bg-orange-500/20 text-orange-400',
  nutricao: 'bg-pink-500/20 text-pink-400',
  arquivado: 'bg-gray-700/40 text-gray-500',
};

interface Lead {
  id: string; nome?: string; telefone: string; score: number; status: string;
  procedimento_interesse?: string; data_contato: string; created_at: string;
  data_agendamento?: string; horario_agendamento?: string;
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-white/50">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-display">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const { selectedId } = useClinicaStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const { data: leadsData, isLoading } = useQuery<{ data: Lead[] }>({
    queryKey: ['leads-dashboard', selectedId],
    queryFn: () => api.get(`/leads?${selectedId ? `clinica_id=${selectedId}&` : ''}limit=500`).then(r => r.data),
    enabled: !!selectedId,
    refetchInterval: 30000,
  });

  const { data: baileysData } = useQuery({
    queryKey: ['baileys-status', selectedId],
    queryFn: () => api.get(`/baileys/status?clinica_id=${selectedId}`).then(r => r.data),
    enabled: !!selectedId,
    refetchInterval: 15000,
  });

  const leads = leadsData?.data ?? [];

  const metrics = useMemo(() => {
    const now = new Date();
    const yesterday = subDays(now, 1);
    const totalLeads = leads.length;
    const leadsHoje = leads.filter(l => new Date(l.created_at) > yesterday).length;
    const convertidos = leads.filter(l => l.status === 'convertido').length;
    const agendadosHoje = leads.filter(l => {
      if (!l.data_agendamento) return false;
      return l.data_agendamento === format(now, 'yyyy-MM-dd');
    }).length;
    const taxaConversao = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 100) : 0;
    return { totalLeads, leadsHoje, agendadosHoje, taxaConversao };
  }, [leads]);

  // Build last 7 days chart data
  const weekData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = leads.filter(l => l.created_at?.startsWith(dayStr)).length;
      return { dia: format(day, 'EEE', { locale: ptBR }), leads: count };
    });
  }, [leads]);

  // Agendamentos de hoje
  const agendamentosHoje = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return leads
      .filter(l => l.data_agendamento === today)
      .sort((a, b) => (a.horario_agendamento ?? '').localeCompare(b.horario_agendamento ?? ''));
  }, [leads]);

  // Recent leads
  const recentLeads = useMemo(() =>
    [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [leads]
  );

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      <PageGlow />
      <div className="relative p-8" style={{ zIndex: 1 }}>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              {greeting}, {user?.name?.split(' ')[0] ?? 'Admin'}!
            </h2>
            <p className="text-white/40 mt-1 text-sm">Aqui está o resumo do seu CRM hoje.</p>
          </div>
          {isLoading && <RefreshCw size={18} className="text-brand-400 animate-spin" />}
        </div>

        {!selectedId ? (
          <div className="text-center py-20 text-white/30">Selecione uma clínica na sidebar</div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total de Leads" value={metrics.totalLeads} sub="todos os status" icon={Users} accent="bg-brand-500/20 text-brand-400" />
              <StatCard label="Agendamentos Hoje" value={metrics.agendadosHoje} sub="confirmados" icon={CalendarCheck} accent="bg-emerald-500/20 text-emerald-400" />
              <StatCard label="Taxa de Conversão" value={`${metrics.taxaConversao}%`} sub="leads convertidos" icon={TrendingUp} accent="bg-amber-500/20 text-amber-400" />
              <StatCard label="Leads Novos" value={metrics.leadsHoje} sub="últimas 24h" icon={UserPlus} accent="bg-blue-500/20 text-blue-400" />
            </div>

            {/* Agendamentos hoje */}
            {agendamentosHoje.length > 0 && (
              <div className="card p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarCheck size={16} className="text-brand-400" />
                  <h3 className="font-display font-semibold text-white">Agendamentos de Hoje</h3>
                  <span className="ml-auto text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                    {agendamentosHoje.length} agendamentos
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {agendamentosHoje.map(ag => (
                    <div key={ag.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand-500/20 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-400 font-display">{ag.horario_agendamento ?? '—'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{ag.nome ?? ag.telefone}</p>
                        <p className="text-xs text-brand-400/80 truncate">{ag.procedimento_interesse ?? '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Bar chart */}
              <div className="card p-5 lg:col-span-2">
                <h3 className="font-display font-semibold text-white mb-4">Leads — Últimos 7 dias</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1a1025', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }}
                        cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                      />
                      <Bar dataKey="leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* System status */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-white mb-4">Status do Sistema</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Backend API', ok: true },
                    { label: 'Banco de Dados', ok: leads.length >= 0 },
                    { label: 'WhatsApp', ok: baileysData?.connected === true, warn: baileysData?.status === 'connecting' },
                    { label: 'IA Groq', ok: true },
                  ].map(({ label, ok, warn }) => (
                    <div key={label} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        {ok ? (
                          <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle size={14} className={clsx('flex-shrink-0', warn ? 'text-amber-400' : 'text-rose-400')} />
                        )}
                        <span className="text-sm text-white/60">{label}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        ok ? 'bg-emerald-500/20 text-emerald-400' :
                        warn ? 'bg-amber-500/20 text-amber-400' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        {ok ? 'Online' : warn ? 'Conectando' : 'Offline'}
                      </span>
                    </div>
                  ))}
                </div>

                {baileysData?.phone && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-xs text-white/30">Número conectado</p>
                    <p className="text-sm text-emerald-400 font-medium mt-0.5">+{baileysData.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent leads */}
            <div className="card p-5">
              <h3 className="font-display font-semibold text-white mb-4">Leads Recentes</h3>
              {recentLeads.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-8">Nenhum lead ainda. Conecte o WhatsApp para começar.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-xs text-white/40 font-medium pb-3 pr-4">Nome / Tel</th>
                        <th className="text-left text-xs text-white/40 font-medium pb-3 pr-4">Score</th>
                        <th className="text-left text-xs text-white/40 font-medium pb-3 pr-4">Status</th>
                        <th className="text-left text-xs text-white/40 font-medium pb-3 pr-4">Procedimento</th>
                        <th className="text-left text-xs text-white/40 font-medium pb-3">Contato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLeads.map(lead => (
                        <tr key={lead.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-4">
                            <span className="text-sm font-medium text-white">{lead.nome ?? lead.telefone}</span>
                            {lead.nome && <p className="text-xs text-white/30">{lead.telefone}</p>}
                          </td>
                          <td className="py-3 pr-4"><ScoreBadge score={lead.score} /></td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                              {STATUS_LABELS[lead.status] ?? lead.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            {lead.procedimento_interesse ? (
                              <span className="text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">
                                {lead.procedimento_interesse}
                              </span>
                            ) : <span className="text-xs text-white/20">—</span>}
                          </td>
                          <td className="py-3">
                            <span className="text-xs text-white/30">
                              {formatDistanceToNow(new Date(lead.data_contato || lead.created_at), { locale: ptBR, addSuffix: true })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
