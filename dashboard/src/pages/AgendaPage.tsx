import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, X, RefreshCw, Calendar, Clock, User, Scissors, AlertCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '../services/api';
import { useClinicaStore } from '../store/clinicaStore';
import { PageGlow } from '../components/ui/PageGlow';
import { displayName, formatPhone } from '../utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agendamento {
  id: string;
  lead_id: string | null;
  clinica_id: string;
  procedimento_id: string | null;
  data: string;
  horario: string;
  duracao_minutos: number;
  status: 'agendado' | 'cancelado' | 'confirmado' | 'encaixe_pendente';
  tipo: 'normal' | 'encaixe';
  observacoes: string | null;
  nome_display: string | null;
  telefone: string | null;
  lead_nome: string | null;
  procedimento_nome: string | null;
  nome_paciente: string | null;
}

interface Procedimento {
  id: string;
  nome: string;
  duracao_minutos: number;
}

interface SlotData {
  slots: Record<string, string[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIAS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function formatHorario(h: string) {
  return h?.slice(0, 5) ?? h;
}

// PostgreSQL DATE columns return as "YYYY-MM-DDTHH:MM:SS.000Z" — normalize to "YYYY-MM-DD"
function agDate(a: Agendamento): string {
  return String(a.data).slice(0, 10);
}

function statusColor(status: string, tipo: string) {
  if (tipo === 'encaixe') return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
  if (status === 'cancelado') return 'bg-rose-500/10 border-rose-500/20 text-rose-400 opacity-60';
  if (status === 'confirmado') return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
  return 'bg-brand-500/20 border-brand-500/30 text-brand-300';
}

// ─── Modal Novo Agendamento ───────────────────────────────────────────────────

function NovoAgendamentoModal({
  clinicaId, diaInicial, horarioInicial, onClose, onSuccess,
}: {
  clinicaId: string; diaInicial?: string; horarioInicial?: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const [data, setData] = useState(diaInicial ?? toDateStr(new Date()));
  const [horario, setHorario] = useState(horarioInicial ?? '09:00');
  const [nomePaciente, setNomePaciente] = useState('');
  const [procedimentoId, setProcedimentoId] = useState('');
  const [tipo, setTipo] = useState<'normal' | 'encaixe'>('normal');
  const [observacoes, setObs] = useState('');

  const { data: procs } = useQuery<{ procedimentos: Procedimento[] }>({
    queryKey: ['setup-procs', clinicaId],
    queryFn: () => api.get(`/clinicas/${clinicaId}/setup`).then(r => r.data),
    select: d => d,
  });

  const { data: slotsData } = useQuery<{ slots: string[]; ocupados: string[] }>({
    queryKey: ['slots', clinicaId, data],
    queryFn: () => api.get(`/agendamentos/slots?clinica_id=${clinicaId}&data=${data}`).then(r => r.data),
    enabled: !!data,
  });

  const mutation = useMutation({
    mutationFn: (body: object) => api.post('/agendamentos', body),
    onSuccess: () => { toast.success('Agendamento criado!'); onSuccess(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Erro ao criar'),
  });

  const proc = (procs as any)?.procedimentos ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1025] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-white">Novo Agendamento</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {(['normal', 'encaixe'] as const).map(t => (
              <button key={t} onClick={() => setTipo(t)}
                className={clsx('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                  tipo === t ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'border-white/10 text-white/40 hover:border-white/20')}>
                {t === 'encaixe' ? '⚡ Encaixe' : '📅 Normal'}
              </button>
            ))}
          </div>

          {/* Nome */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Nome do paciente</label>
            <input value={nomePaciente} onChange={e => setNomePaciente(e.target.value)}
              placeholder="Nome completo"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50" />
          </div>

          {/* Data */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50" />
          </div>

          {/* Horário */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Horário</label>
            {slotsData?.slots && slotsData.slots.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {slotsData.slots.map(s => (
                  <button key={s} onClick={() => setHorario(s)}
                    className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      horario === s ? 'bg-brand-500/30 border-brand-500/50 text-brand-300' : 'border-white/10 text-white/50 hover:border-white/25')}>
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <input type="time" value={horario} onChange={e => setHorario(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50" />
            )}
            {slotsData?.ocupados && slotsData.ocupados.length > 0 && (
              <p className="text-xs text-white/25 mt-1">Ocupados: {slotsData.ocupados.join(', ')}</p>
            )}
          </div>

          {/* Procedimento */}
          {proc.length > 0 && (
            <div>
              <label className="text-xs text-white/40 mb-1 block">Procedimento (opcional)</label>
              <select value={procedimentoId} onChange={e => setProcedimentoId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50">
                <option value="" style={{ background: '#1a1025' }}>Selecione...</option>
                {proc.map((p: Procedimento) => (
                  <option key={p.id} value={p.id} style={{ background: '#1a1025' }}>{p.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Observações (opcional)</label>
            <input value={observacoes} onChange={e => setObs(e.target.value)} placeholder="..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50" />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/50 text-sm hover:bg-white/5">Cancelar</button>
          <button
            disabled={!data || !horario || mutation.isPending}
            onClick={() => mutation.mutate({ clinica_id: clinicaId, data, horario, nome_paciente: nomePaciente, procedimento_id: procedimentoId || undefined, observacoes: observacoes || undefined, tipo })}
            className="flex-1 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : null}
            Agendar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Detalhe Agendamento ────────────────────────────────────────────────

function AgendamentoModal({ ag, onClose, onCancel, onRefresh }: {
  ag: Agendamento; onClose: () => void;
  onCancel: (id: string) => void; onRefresh: () => void;
}) {
  const dataFmt = new Date(agDate(ag) + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const nome = displayName(ag.nome_display || ag.lead_nome || ag.nome_paciente, ag.telefone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1025] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', statusColor(ag.status, ag.tipo))}>
              {ag.tipo === 'encaixe' ? '⚡ Encaixe' : ag.status === 'confirmado' ? '✅ Confirmado' : ag.status === 'cancelado' ? '❌ Cancelado' : '📅 Agendado'}
            </span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User size={15} className="text-white/30 flex-shrink-0" />
            <span className="text-sm text-white">{nome}</span>
          </div>
          {ag.telefone && (
            <div className="flex items-center gap-3">
              <span className="text-white/30 text-xs w-[15px]">📱</span>
              <span className="text-sm text-white/60">{formatPhone(ag.telefone) || ag.telefone}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar size={15} className="text-white/30 flex-shrink-0" />
            <span className="text-sm text-white">{dataFmt}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={15} className="text-white/30 flex-shrink-0" />
            <span className="text-sm text-white">{formatHorario(ag.horario)}</span>
            <span className="text-xs text-white/30">{ag.duracao_minutos}min</span>
          </div>
          {ag.procedimento_nome && (
            <div className="flex items-center gap-3">
              <Scissors size={15} className="text-white/30 flex-shrink-0" />
              <span className="text-sm text-white">{ag.procedimento_nome}</span>
            </div>
          )}
          {ag.observacoes && (
            <div className="flex items-start gap-3">
              <AlertCircle size={15} className="text-white/30 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-white/60">{ag.observacoes}</span>
            </div>
          )}
        </div>

        {ag.status !== 'cancelado' && (
          <button
            onClick={() => { onCancel(ag.id); onClose(); }}
            className="mt-5 w-full py-2.5 rounded-lg border border-rose-500/20 text-rose-400 text-sm hover:bg-rose-500/10 transition-colors"
          >
            Cancelar agendamento
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ clinicaId, semanaInicio, agendamentos, slotsWeek, onSlotClick, onAgClick }: {
  clinicaId: string; semanaInicio: Date;
  agendamentos: Agendamento[]; slotsWeek: Record<string, string[]>;
  onSlotClick: (dia: string, horario: string) => void;
  onAgClick: (ag: Agendamento) => void;
}) {
  const dias = Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i));

  // Collect all unique time slots for the week
  const allTimes = new Set<string>();
  dias.forEach(d => {
    const ds = toDateStr(d);
    (slotsWeek[ds] ?? []).forEach(s => allTimes.add(s));
    agendamentos.filter(a => agDate(a) === ds).forEach(a => allTimes.add(formatHorario(a.horario)));
  });
  const times = [...allTimes].sort();

  if (times.length === 0) {
    return (
      <div className="text-center py-16 text-white/25 text-sm">
        Nenhum horário disponível nesta semana.<br />
        Verifique os horários de funcionamento no Setup da Clínica.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse">
        <thead>
          <tr>
            <th className="w-16 py-2 text-xs text-white/20 font-normal text-right pr-3">Hora</th>
            {dias.map(d => {
              const isHoje = toDateStr(d) === toDateStr(new Date());
              return (
                <th key={toDateStr(d)} className="py-2 text-xs font-medium text-center">
                  <span className={clsx('block', isHoje ? 'text-brand-400' : 'text-white/40')}>
                    {DIAS_PT[d.getDay()]}
                  </span>
                  <span className={clsx('block text-base font-bold mt-0.5', isHoje ? 'text-brand-400' : 'text-white/70')}>
                    {String(d.getDate()).padStart(2, '0')}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {times.map(time => (
            <tr key={time} className="border-t border-white/[0.04]">
              <td className="py-1.5 text-right pr-3 text-xs text-white/20 align-top pt-2">{time}</td>
              {dias.map(d => {
                const ds = toDateStr(d);
                const ags = agendamentos.filter(a => agDate(a) === ds && formatHorario(a.horario) === time);
                const isAvailable = (slotsWeek[ds] ?? []).includes(time);

                return (
                  <td key={ds} className="p-1 align-top">
                    {ags.length > 0 ? (
                      <div className="space-y-1">
                        {ags.map(ag => (
                          <button key={ag.id} onClick={() => onAgClick(ag)}
                            className={clsx('w-full text-left px-2 py-1.5 rounded-lg border text-xs transition-all hover:brightness-110', statusColor(ag.status, ag.tipo))}>
                            <div className="font-medium truncate">
                              {ag.tipo === 'encaixe' && '⚡ '}
                              {displayName(ag.nome_display || ag.lead_nome || ag.nome_paciente, ag.telefone)}
                            </div>
                            {ag.procedimento_nome && (
                              <div className="text-[10px] opacity-70 truncate">{ag.procedimento_nome}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : isAvailable ? (
                      <button onClick={() => onSlotClick(ds, time)}
                        className="w-full h-8 rounded-lg border border-dashed border-white/10 hover:border-brand-500/40 hover:bg-brand-500/5 transition-all text-white/20 hover:text-brand-400 text-xs">
                        +
                      </button>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const { selectedId: clinicaId } = useClinicaStore();
  const qc = useQueryClient();

  const [semana, setSemana] = useState(() => startOfWeek(new Date()));
  const [modalNovo, setModalNovo] = useState<{ dia?: string; horario?: string } | null>(null);
  const [modalAg, setModalAg] = useState<Agendamento | null>(null);

  const dataInicio = toDateStr(semana);
  const dataFim = toDateStr(addDays(semana, 6));

  const { data, isLoading } = useQuery<{ data: Agendamento[] }>({
    queryKey: ['agendamentos', clinicaId, dataInicio],
    queryFn: () => api.get(`/agendamentos?clinica_id=${clinicaId}&data_inicio=${dataInicio}&data_fim=${dataFim}`).then(r => r.data),
    enabled: !!clinicaId,
    refetchInterval: 30000,
  });

  const { data: slotsData } = useQuery<SlotData>({
    queryKey: ['slots-week', clinicaId, dataInicio],
    queryFn: () => api.get(`/agendamentos/slots-week?clinica_id=${clinicaId}&data_inicio=${dataInicio}`).then(r => r.data),
    enabled: !!clinicaId,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/agendamentos/${id}`),
    onSuccess: () => {
      toast.success('Agendamento cancelado');
      qc.invalidateQueries({ queryKey: ['agendamentos', clinicaId] });
    },
    onError: () => toast.error('Erro ao cancelar'),
  });

  const agendamentos = (data?.data ?? []).filter(a => a.status !== 'cancelado');
  const slotsWeek = slotsData?.slots ?? {};

  const totalSemana = agendamentos.filter(a => a.status !== 'cancelado').length;
  const hoje = agendamentos.filter(a => agDate(a) === toDateStr(new Date()) && a.status !== 'cancelado').length;

  const mesLabel = `${MESES_PT[semana.getMonth()]} ${semana.getFullYear()}`;

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      <PageGlow />
      <div className="relative p-8" style={{ zIndex: 1 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Agenda</h2>
            <p className="text-white/40 text-sm mt-1">{mesLabel}</p>
          </div>
          {clinicaId && (
            <button
              onClick={() => setModalNovo({})}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors"
            >
              <Plus size={16} /> Novo agendamento
            </button>
          )}
        </div>

        {!clinicaId ? (
          <div className="text-center py-20 text-white/30">Selecione uma clínica na sidebar</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center">
                    <Calendar size={16} className="text-brand-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white font-display">{totalSemana}</p>
                    <p className="text-xs text-white/30">Esta semana</p>
                  </div>
                </div>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <Clock size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white font-display">{hoje}</p>
                    <p className="text-xs text-white/30">Hoje</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Week navigation */}
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setSemana(d => addDays(d, -7))}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">
                    {addDays(semana, 0).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} —{' '}
                    {addDays(semana, 6).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </p>
                  <button onClick={() => setSemana(startOfWeek(new Date()))}
                    className="text-xs text-brand-400 hover:underline mt-0.5">Hoje</button>
                </div>
                <button onClick={() => setSemana(d => addDays(d, 7))}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-10">
                  <RefreshCw size={20} className="text-brand-500 animate-spin" />
                </div>
              ) : (
                <WeekView
                  clinicaId={clinicaId}
                  semanaInicio={semana}
                  agendamentos={agendamentos}
                  slotsWeek={slotsWeek}
                  onSlotClick={(dia, horario) => setModalNovo({ dia, horario })}
                  onAgClick={ag => setModalAg(ag)}
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/30 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-brand-500/30 border border-brand-500/40" /> Agendado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/40" /> Confirmado
              </span>
              <span className="flex items-center gap-1.5">
                <Zap size={12} className="text-amber-400" /> Encaixe
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm border border-dashed border-white/15" /> Horário livre (clique para agendar)
              </span>
            </div>
          </>
        )}
      </div>

      {/* Modais */}
      {modalNovo && clinicaId && (
        <NovoAgendamentoModal
          clinicaId={clinicaId}
          diaInicial={modalNovo.dia}
          horarioInicial={modalNovo.horario}
          onClose={() => setModalNovo(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['agendamentos', clinicaId] })}
        />
      )}

      {modalAg && (
        <AgendamentoModal
          ag={modalAg}
          onClose={() => setModalAg(null)}
          onCancel={id => cancelMutation.mutate(id)}
          onRefresh={() => qc.invalidateQueries({ queryKey: ['agendamentos', clinicaId] })}
        />
      )}
    </div>
  );
}
