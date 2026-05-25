import { useState } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageGlow } from '../components/ui/PageGlow';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { MOCK_LEADS, MOCK_ATIVIDADE, MOCK_METRICAS, MOCK_CLINICAS, MOCK_TOP_PROCEDIMENTOS } from '../services/mockData';
import { useClinicaStore } from '../store/clinicaStore';
import { LeadStatus } from '../types';
import clsx from 'clsx';

type Period = 'hoje' | '7d' | '30d' | '90d';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
];

const PIE_COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#10b981', '#f59e0b', '#f43f5e', '#374151'];

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

const kpiList = [
  { label: 'Total Leads', key: 'total_leads' as const, color: 'text-brand-400', bg: 'bg-brand-500/10' },
  { label: 'Qualificados', key: 'total_leads' as const, value: 7, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Agendamentos', key: 'agendamentos' as const, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Conversão %', key: 'taxa_conversao' as const, suffix: '%', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Follow-up', key: 'total_leads' as const, value: 2, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { label: 'Nutrição', key: 'total_leads' as const, value: 2, color: 'text-pink-400', bg: 'bg-pink-500/10' },
];

const pieData = Object.entries(MOCK_METRICAS.leads_por_status).map(([key, value]) => ({
  name: STATUS_LABELS[key as LeadStatus],
  value,
}));

const topLeads = [...MOCK_LEADS].sort((a, b) => b.score - a.score).slice(0, 10);

export default function MetricasPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const { selectedId, setSelected } = useClinicaStore();

  const days = period === 'hoje' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const chartData = period === 'hoje'
    ? [{ dia: 'Hoje', leads: 4, agendados: 2 }]
    : MOCK_ATIVIDADE.slice(-Math.min(days, MOCK_ATIVIDADE.length));

  const filteredLeads = selectedId
    ? MOCK_LEADS.filter(l => l.clinica_id === selectedId)
    : MOCK_LEADS;

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      <PageGlow />
      <div className="relative p-8" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Métricas</h2>
            <p className="text-white/40 text-sm mt-1">Análise de performance do CRM</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedId || ''}
              onChange={e => setSelected(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-brand-500/50 cursor-pointer"
            >
              {MOCK_CLINICAS.map(c => (
                <option key={c.id} value={c.id} style={{ background: '#1a1025' }}>{c.nome}</option>
              ))}
            </select>
            <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-lg p-1">
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    period === p.id ? 'bg-brand-500/20 text-brand-400' : 'text-white/40 hover:text-white/70'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {kpiList.map((kpi, i) => {
            const val = kpi.value !== undefined ? kpi.value : MOCK_METRICAS[kpi.key];
            return (
              <div key={i} className="card p-5">
                <p className="text-xs text-white/40 mb-2">{kpi.label}</p>
                <p className={clsx('font-display text-3xl font-bold', kpi.color)}>
                  {val}{kpi.suffix ?? ''}
                </p>
                <div className={clsx('mt-3 h-1 rounded-full', kpi.bg)}>
                  <div className="h-full rounded-full bg-current opacity-60" style={{ width: `${Math.min((Number(val) / 25) * 100, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Line Chart */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-white mb-4">Leads por Dia</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                    interval={Math.floor(chartData.length / 6)} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1025', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '12px' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Line type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Leads" />
                  <Line type="monotone" dataKey="agendados" stroke="#10b981" strokeWidth={2} dot={false} name="Agendados" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-brand-500 rounded" /><span className="text-xs text-white/40">Leads</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 rounded" /><span className="text-xs text-white/40">Agendados</span></div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-white mb-4">Distribuição por Status</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1a1025', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* External legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-white/40 truncate">{entry.name}</span>
                  <span className="text-xs text-white/60 ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top procedimentos table */}
        <div className="card p-5 mb-6">
          <h3 className="font-display font-semibold text-white mb-4">Top Procedimentos Mais Procurados</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Procedimento', 'Total Leads', 'Agendamentos', 'Conversão %'].map(h => (
                    <th key={h} className="text-left text-xs text-white/30 font-medium pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_TOP_PROCEDIMENTOS.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-white">{row.procedimento}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-white/70 font-display">{row.total_leads}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-emerald-400 font-display">{row.agendamentos}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          'text-sm font-display font-semibold',
                          row.conversao >= 40 ? 'text-emerald-400' : row.conversao >= 20 ? 'text-amber-400' : 'text-rose-400'
                        )}>
                          {row.conversao.toFixed(1)}%
                        </span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full min-w-[60px]">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${Math.min(row.conversao, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top leads table */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white mb-4">Top Leads por Score</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['#', 'Nome', 'Score', 'Status', 'Procedimento', 'Última interação'].map(h => (
                    <th key={h} className="text-left text-xs text-white/30 font-medium pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topLeads.map((lead, i) => (
                  <tr key={lead.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-xs text-white/20 font-mono">#{i + 1}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-white">{lead.nome ?? lead.telefone}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <ScoreBadge score={lead.score} />
                    </td>
                    <td className="py-3 pr-4">
                      <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[lead.status])}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {lead.procedimento_interesse ? (
                        <span className="text-xs text-brand-400">{lead.procedimento_interesse}</span>
                      ) : (
                        <span className="text-xs text-white/20">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-white/30">
                        {formatDistanceToNow(new Date(lead.updated_at), { locale: ptBR, addSuffix: true })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
