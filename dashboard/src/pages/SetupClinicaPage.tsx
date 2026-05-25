import { useState, useRef, DragEvent, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Scissors, CreditCard, Star, Calendar, Link2, Target, FileText,
  ChevronDown, Plus, Trash2, Loader2, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageGlow } from '../components/ui/PageGlow';
import { useClinicaStore } from '../store/clinicaStore';
import api from '../services/api';
import clsx from 'clsx';

// ─── Shared Components ────────────────────────────────────────────────────────

function Block({ id, label, icon: Icon, active, onToggle, children }: {
  id: string; label: string; icon: React.ElementType;
  active: string | null; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  const isOpen = active === id;
  return (
    <div className={clsx('card transition-colors', isOpen && 'border-brand-500/30')}>
      <button onClick={() => onToggle(id)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <span className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
          isOpen ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-white/40')}>
          <Icon size={15} />
        </span>
        <span className={clsx('flex-1 text-sm font-semibold', isOpen ? 'text-white' : 'text-white/60')}>{label}</span>
        <ChevronDown size={14} className={clsx('text-white/30 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-white/[0.06]">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function Input({ label, placeholder, type = 'text', value, onChange }: {
  label: string; placeholder?: string; type?: string; value?: string; onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-white/40 mb-1.5 block">{label}</label>
      <input type={type} placeholder={placeholder} value={value ?? ''} onChange={e => onChange?.(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40" />
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm text-white/60">{label}</span>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={clsx('w-10 h-5 rounded-full transition-colors relative flex-shrink-0', checked ? 'bg-brand-500' : 'bg-white/10')}>
        <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', checked ? 'left-5' : 'left-0.5')} />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SetupClinicaPage() {
  const { selectedId } = useClinicaStore();
  const qc = useQueryClient();
  const [active, setActive] = useState<string | null>('identidade');
  const toggle = (id: string) => setActive(v => v === id ? null : id);

  // ── Block 1 — Identidade
  const [nome, setNome] = useState('');
  const [nomeDra, setNomeDra] = useState('');
  const [nomeAtendente, setNomeAtendente] = useState('');
  const [instagram, setInstagram] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tom, setTom] = useState('Amigável');

  // ── Block 2 — Procedimentos
  const [procs, setProcs] = useState<Array<{ nome: string; duracao_minutos: number; valor_inteiro: string; valor_parcelado: string; parcelas: string }>>([]);

  // ── Block 3 — Consulta
  const [cobraConsulta, setCobraConsulta] = useState(false);
  const [valorConsulta, setValorConsulta] = useState('');
  const [abateConsulta, setAbateConsulta] = useState(false);
  const [chavePix, setChavePix] = useState('');

  // ── Block 4 — Procedimentos de Entrada
  const [procsEntrada, setProcsEntrada] = useState<Array<{ nome: string; valor_inteiro: string; valor_parcelado: string; parcelas: string }>>([]);

  // ── Block 5 — Paciente Modelo
  const [pacienteAtivo, setPacienteAtivo] = useState(false);
  const [descPaciente, setDescPaciente] = useState('');
  const [valorMinimo, setValorMinimo] = useState('');

  // ── Block 6 — Agenda
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const [days, setDays] = useState([true, true, true, true, true, false, false]);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('18:00');
  const [atendente24h, setAtendente24h] = useState(false);
  const [funcDomingo, setFuncDomingo] = useState(false);
  const [fpManha, setFpManha] = useState('09:00');
  const [fpTarde, setFpTarde] = useState('14:00');
  const [fpNoite, setFpNoite] = useState('19:00');

  // ── Block 7 — Instagram links
  const [links, setLinks] = useState<string[]>([]);

  // ── Block 8 — Qualificação
  const [perfilIdeal, setPerfilIdeal] = useState('');
  const [perfilIndesejado, setPerfilIndesejado] = useState('');

  // ── Block 9 — Upload
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedFields, setExtractedFields] = useState<Record<string, string> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load setup from API
  const { data: setupData, isLoading } = useQuery({
    queryKey: ['clinica-setup', selectedId],
    queryFn: () => api.get(`/clinicas/${selectedId}/setup`).then(r => r.data),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (!setupData) return;
    const c = setupData.clinica ?? {};
    setNome(c.nome ?? '');
    setNomeDra(c.nome_dra ?? '');
    setNomeAtendente(c.nome_atendente ?? '');
    setInstagram(c.instagram ?? '');
    setEndereco(c.endereco ?? '');
    setTom(c.tom ?? 'Amigável');
    setCobraConsulta(c.cobra_consulta ?? false);
    setValorConsulta(c.valor_consulta ? String(c.valor_consulta) : '');
    setAbateConsulta(c.consulta_abate ?? false);
    setChavePix(c.chave_pix ?? '');
    setHorarioInicio(c.horario_inicio ?? '08:00');
    setHorarioFim(c.horario_fim ?? '18:00');
    setAtendente24h(c.atendente_24h ?? false);
    setFuncDomingo(c.funciona_domingo ?? false);
    setFpManha(c.follow_up_manha ?? '09:00');
    setFpTarde(c.follow_up_tarde ?? '14:00');
    setFpNoite(c.follow_up_noite ?? '19:00');
    setPerfilIdeal(c.perfil_ideal ?? '');
    setPerfilIndesejado(c.perfil_indesejado ?? '');

    if (setupData.procedimentos?.length) {
      setProcs(setupData.procedimentos.map((p: any) => ({
        nome: p.nome ?? '',
        duracao_minutos: p.duracao_minutos ?? 60,
        valor_inteiro: p.valor_inteiro ? String(p.valor_inteiro) : '',
        valor_parcelado: p.valor_parcelado ? String(p.valor_parcelado) : '',
        parcelas: p.parcelas ? String(p.parcelas) : '1',
      })));
    }

    if (setupData.procedimentos_entrada?.length) {
      setProcsEntrada(setupData.procedimentos_entrada.map((p: any) => ({
        nome: p.nome ?? '',
        valor_inteiro: p.valor_inteiro ? String(p.valor_inteiro) : '',
        valor_parcelado: p.valor_parcelado ? String(p.valor_parcelado) : '',
        parcelas: p.parcelas ? String(p.parcelas) : '1',
      })));
    }

    if (setupData.paciente_modelo) {
      setPacienteAtivo(setupData.paciente_modelo.ativo ?? false);
      setDescPaciente(setupData.paciente_modelo.descricao ?? '');
      setValorMinimo(setupData.paciente_modelo.valor_minimo_interesse ? String(setupData.paciente_modelo.valor_minimo_interesse) : '');
    }

    if (setupData.conteudos_instagram?.length) {
      setLinks(setupData.conteudos_instagram.map((c: any) => c.link ?? c.url ?? c.conteudo ?? ''));
    }
  }, [setupData]);

  // ── Save mutation
  const saveMutation = useMutation({
    mutationFn: () => api.post(`/clinicas/${selectedId}/setup`, {
      clinica: {
        nome, nome_dra: nomeDra, nome_atendente: nomeAtendente,
        instagram, endereco, tom,
        cobra_consulta: cobraConsulta,
        valor_consulta: valorConsulta ? Number(valorConsulta) : null,
        consulta_abate: abateConsulta,
        chave_pix: chavePix,
        horario_inicio: horarioInicio, horario_fim: horarioFim,
        atendente_24h: atendente24h, funciona_domingo: funcDomingo,
        follow_up_manha: fpManha, follow_up_tarde: fpTarde, follow_up_noite: fpNoite,
        perfil_ideal: perfilIdeal, perfil_indesejado: perfilIndesejado,
      },
      procedimentos: procs.map(p => ({
        nome: p.nome, duracao_minutos: p.duracao_minutos,
        valor_inteiro: p.valor_inteiro ? Number(p.valor_inteiro) : null,
        valor_parcelado: p.valor_parcelado ? Number(p.valor_parcelado) : null,
        parcelas: p.parcelas ? Number(p.parcelas) : 1,
        ativo: true,
      })),
      procedimentos_entrada: procsEntrada.map(p => ({
        nome: p.nome,
        valor_inteiro: p.valor_inteiro ? Number(p.valor_inteiro) : null,
        valor_parcelado: p.valor_parcelado ? Number(p.valor_parcelado) : null,
        parcelas: p.parcelas ? Number(p.parcelas) : 1,
      })),
      paciente_modelo: { ativo: pacienteAtivo, descricao: descPaciente, valor_minimo_interesse: valorMinimo ? Number(valorMinimo) : null },
      conteudos_instagram: links.filter(Boolean),
    }),
    onSuccess: () => {
      toast.success('Configurações salvas com sucesso!');
      qc.invalidateQueries({ queryKey: ['clinica-setup', selectedId] });
      qc.invalidateQueries({ queryKey: ['clinica-detail', selectedId] });
    },
    onError: () => toast.error('Erro ao salvar configurações'),
  });

  // ── Briefing upload
  async function handleFileUpload(file: File) {
    setUploadedFile(file.name);
    setAnalyzing(true);
    setExtractedFields(null);
    try {
      const form = new FormData();
      form.append('arquivo', file);
      const res = await api.post(`/clinicas/${selectedId}/briefing`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setExtractedFields(res.data.campos_sugeridos ?? {});
    } catch { toast.error('Erro ao processar arquivo'); }
    finally { setAnalyzing(false); }
  }

  if (!selectedId) {
    return (
      <div className="relative min-h-screen flex items-center justify-center" style={{ zIndex: 1 }}>
        <PageGlow />
        <p className="text-white/30 relative z-10">Selecione uma clínica na sidebar para configurar</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      <PageGlow />
      <div className="relative p-8 max-w-3xl mx-auto" style={{ zIndex: 1 }}>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Setup da Clínica</h2>
            <p className="text-white/40 text-sm mt-1">Configure todos os parâmetros da IA para sua clínica</p>
          </div>
          {isLoading && <Loader2 size={18} className="text-brand-400 animate-spin" />}
        </div>

        <div className="space-y-3">

          {/* Block 1 — Identidade */}
          <Block id="identidade" label="Identidade da Clínica" icon={User} active={active} onToggle={toggle}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nome da Clínica" value={nome} onChange={setNome} placeholder="Ex: Bella Estética SP" />
              <Input label="Nome da Dra." value={nomeDra} onChange={setNomeDra} placeholder="Ex: Dra. Marina Santos" />
              <Input label="Nome da Atendente (IA)" value={nomeAtendente} onChange={setNomeAtendente} placeholder="Ex: Sofia" />
              <Input label="Instagram" value={instagram} onChange={setInstagram} placeholder="@suaclinica" />
              <div className="sm:col-span-2">
                <Input label="Endereço da Clínica" value={endereco} onChange={setEndereco} placeholder="Ex: Rua das Flores, 123 - Bela Vista, São Paulo/SP" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-white/40 mb-1.5 block">Tom de Comunicação</label>
                <select value={tom} onChange={e => setTom(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/40">
                  {['Formal', 'Amigável', 'Descontraído', 'Profissional'].map(t => (
                    <option key={t} value={t} style={{ background: '#1a1025' }}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </Block>

          {/* Block 2 — Procedimentos */}
          <Block id="procedimentos" label="Procedimentos" icon={Scissors} active={active} onToggle={toggle}>
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Procedimento', 'Duração (min)', 'Valor Inteiro (R$)', 'Valor Parcelado (R$)', 'Parcelas', ''].map(h => (
                        <th key={h} className="text-left text-white/30 font-medium pb-2 pr-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {procs.map((p, i) => (
                      <tr key={i} className="border-b border-white/[0.03]">
                        {(['nome', 'duracao_minutos', 'valor_inteiro', 'valor_parcelado', 'parcelas'] as const).map(field => (
                          <td key={field} className="py-2 pr-3">
                            <input
                              type={field === 'nome' ? 'text' : 'number'}
                              value={p[field]}
                              onChange={e => {
                                const next = [...procs];
                                (next[i] as any)[field] = field === 'duracao_minutos' ? Number(e.target.value) : e.target.value;
                                setProcs(next);
                              }}
                              className="w-full bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1.5 text-white placeholder-white/20 focus:outline-none focus:border-brand-500/30 text-xs min-w-[80px]"
                              placeholder={field === 'nome' ? 'Nome...' : field === 'parcelas' ? '1' : '0'}
                            />
                          </td>
                        ))}
                        <td className="py-2">
                          <button onClick={() => setProcs(procs.filter((_, j) => j !== i))} className="text-rose-400/60 hover:text-rose-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setProcs([...procs, { nome: '', duracao_minutos: 60, valor_inteiro: '', valor_parcelado: '', parcelas: '1' }])}
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                <Plus size={13} /> Adicionar Procedimento
              </button>
            </div>
          </Block>

          {/* Block 3 — Consulta */}
          <Block id="consulta" label="Consulta" icon={CreditCard} active={active} onToggle={toggle}>
            <div className="space-y-4">
              <Toggle label="Cobra consulta?" checked={cobraConsulta} onChange={setCobraConsulta} />
              {cobraConsulta && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l border-brand-500/20">
                  <Input label="Valor da Consulta (R$)" value={valorConsulta} onChange={setValorConsulta} type="number" placeholder="150" />
                  <Input label="Chave Pix" value={chavePix} onChange={setChavePix} placeholder="email@clinica.com.br" />
                  <div className="sm:col-span-2">
                    <Toggle label="Abate no procedimento?" sub="O valor da consulta é descontado caso feche o procedimento" checked={abateConsulta} onChange={setAbateConsulta} />
                  </div>
                </div>
              )}
              {!cobraConsulta && chavePix && (
                <Input label="Chave Pix (para pagamentos gerais)" value={chavePix} onChange={setChavePix} placeholder="email@clinica.com.br" />
              )}
              {!cobraConsulta && !chavePix && (
                <p className="text-xs text-white/25">Active "Cobra consulta?" para configurar valores e PIX.</p>
              )}
            </div>
          </Block>

          {/* Block 4 — Procedimentos de Entrada */}
          <Block id="entrada" label="Procedimentos de Entrada" icon={Star} active={active} onToggle={toggle}>
            <div className="space-y-3">
              <p className="text-xs text-white/30">Procedimentos mais acessíveis para downsell quando o lead tem resistência financeira.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Procedimento', 'Valor Inteiro (R$)', 'Valor Parcelado (R$)', 'Parcelas', ''].map(h => (
                        <th key={h} className="text-left text-white/30 font-medium pb-2 pr-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {procsEntrada.map((p, i) => (
                      <tr key={i} className="border-b border-white/[0.03]">
                        {(['nome', 'valor_inteiro', 'valor_parcelado', 'parcelas'] as const).map(field => (
                          <td key={field} className="py-2 pr-3">
                            <input
                              type={field === 'nome' ? 'text' : 'number'}
                              value={p[field]}
                              onChange={e => {
                                const next = [...procsEntrada];
                                (next[i] as any)[field] = e.target.value;
                                setProcsEntrada(next);
                              }}
                              className="w-full bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1.5 text-white placeholder-white/20 focus:outline-none focus:border-brand-500/30 text-xs min-w-[80px]"
                              placeholder={field === 'nome' ? 'Ex: Limpeza de Pele' : field === 'parcelas' ? '1' : '0'}
                            />
                          </td>
                        ))}
                        <td className="py-2">
                          <button onClick={() => setProcsEntrada(procsEntrada.filter((_, j) => j !== i))} className="text-rose-400/60 hover:text-rose-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setProcsEntrada([...procsEntrada, { nome: '', valor_inteiro: '', valor_parcelado: '', parcelas: '1' }])}
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                <Plus size={13} /> Adicionar
              </button>
            </div>
          </Block>

          {/* Block 5 — Paciente Modelo */}
          <Block id="paciente" label="Paciente Modelo" icon={User} active={active} onToggle={toggle}>
            <div className="space-y-4">
              <Toggle label="Ativo?" sub="Ativa fluxo especial para pacientes de alto valor" checked={pacienteAtivo} onChange={setPacienteAtivo} />
              {pacienteAtivo && (
                <div className="space-y-4 pl-4 border-l border-brand-500/20">
                  <Input label="Valor Mínimo de Interesse (R$)" value={valorMinimo} onChange={setValorMinimo} type="number" placeholder="500" />
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Descrição do Paciente Ideal</label>
                    <textarea value={descPaciente} onChange={e => setDescPaciente(e.target.value)} rows={3}
                      placeholder="Mulher, 30-50 anos, preocupada com autoestima, renda média-alta..."
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 resize-none" />
                  </div>
                </div>
              )}
            </div>
          </Block>

          {/* Block 6 — Agenda */}
          <Block id="agenda" label="Agenda e Follow-up" icon={Calendar} active={active} onToggle={toggle}>
            <div className="space-y-5">
              <div>
                <p className="text-xs text-white/40 mb-2">Dias de atendimento</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => (
                    <button key={d} onClick={() => { const next = [...days]; next[i] = !next[i]; setDays(next); }}
                      className={clsx('w-10 h-10 rounded-lg text-xs font-semibold transition-colors',
                        days[i] ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : 'bg-white/5 text-white/30 border border-white/10')}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Horário Início" value={horarioInicio} onChange={setHorarioInicio} type="time" />
                <Input label="Horário Fim" value={horarioFim} onChange={setHorarioFim} type="time" />
              </div>
              <div className="space-y-3">
                <Toggle label="Atendente 24h?" sub="IA responde fora do horário configurado" checked={atendente24h} onChange={setAtendente24h} />
                <Toggle label="Funciona domingo?" checked={funcDomingo} onChange={setFuncDomingo} />
              </div>
              <div>
                <p className="text-xs text-white/40 mb-2">Horários de Follow-up</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Manhã" value={fpManha} onChange={setFpManha} type="time" />
                  <Input label="Tarde" value={fpTarde} onChange={setFpTarde} type="time" />
                  <Input label="Noite" value={fpNoite} onChange={setFpNoite} type="time" />
                </div>
              </div>
            </div>
          </Block>

          {/* Block 7 — Conteúdo Instagram */}
          <Block id="instagram" label="Conteúdo Instagram" icon={Link2} active={active} onToggle={toggle}>
            <div className="space-y-2">
              <p className="text-xs text-white/30 mb-3">Links de posts para nutrir leads. A IA enviará a cada 3 dias para leads em nutrição.</p>
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={link} onChange={e => { const next = [...links]; next[i] = e.target.value; setLinks(next); }}
                    placeholder="https://instagram.com/p/..."
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40" />
                  <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="text-rose-400/60 hover:text-rose-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => setLinks([...links, ''])}
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                <Plus size={13} /> Adicionar link
              </button>
            </div>
          </Block>

          {/* Block 8 — Qualificação */}
          <Block id="qualificacao" label="Qualificação" icon={Target} active={active} onToggle={toggle}>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Perfil do cliente ideal (texto livre)</label>
                <textarea value={perfilIdeal} onChange={e => setPerfilIdeal(e.target.value)} rows={4}
                  placeholder="Mulher, 30-50 anos, preocupada com autoestima, renda média-alta, busca resultados naturais..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 resize-none" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Perfis indesejados</label>
                <textarea value={perfilIndesejado} onChange={e => setPerfilIndesejado(e.target.value)} rows={3}
                  placeholder="Clientes que apenas perguntam preço e somem, pedidos fora do escopo..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 resize-none" />
              </div>
            </div>
          </Block>

          {/* Block 9 — Upload Briefing */}
          <Block id="briefing" label="Upload de Briefing" icon={FileText} active={active} onToggle={toggle}>
            <div className="space-y-4">
              <p className="text-xs text-white/30">Envie o briefing da clínica e a IA extrai os campos automaticamente.</p>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                className={clsx('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  dragOver ? 'border-brand-500/60 bg-brand-500/10' : 'border-white/[0.12] hover:border-brand-500/30 hover:bg-brand-500/5')}>
                <FileText size={28} className="mx-auto mb-3 text-white/20" />
                <p className="text-sm text-white/50">Arraste um arquivo ou clique para selecionar</p>
                <p className="text-xs text-white/25 mt-1">PDF, DOC, DOCX aceitos</p>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
              </div>

              {uploadedFile && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={14} className="text-brand-400" />
                    <span className="text-sm text-white/70">{uploadedFile}</span>
                  </div>
                  {analyzing && (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <Loader2 size={12} className="animate-spin" /> Analisando com IA...
                    </div>
                  )}
                  {extractedFields && !analyzing && (
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-400 mb-2">Campos extraídos pela IA:</p>
                      {Object.entries(extractedFields).map(([k, v]) => (
                        <div key={k} className="flex items-start gap-2">
                          <span className="text-xs text-white/40 w-28 flex-shrink-0">{k}:</span>
                          <span className="text-xs text-white/70">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Block>
        </div>

        {/* Save button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !selectedId}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 size={15} className="animate-spin" />}
            Salvar configurações
          </button>
        </div>
      </div>
    </div>
  );
}
