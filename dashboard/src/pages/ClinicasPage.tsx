import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Instagram, Wifi, WifiOff, Trash2, X, RefreshCw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageGlow } from '../components/ui/PageGlow';
import api from '../services/api';

interface Clinica {
  id: string; nome: string; nome_dra?: string; nome_atendente?: string;
  instagram?: string; whatsapp_instance?: string; ia_ativa?: boolean;
  whatsapp_token?: string; created_at: string;
}

function WaBadge({ iaAtiva }: { iaAtiva?: boolean }) {
  const ativo = iaAtiva !== false;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ativo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
      {ativo ? <Wifi size={11} /> : <WifiOff size={11} />}
      {ativo ? 'IA Ativa' : 'IA Pausada'}
    </span>
  );
}

function NovaClinicaModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nome, setNome] = useState('');
  const [nomeDra, setNomeDra] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!nome.trim()) return;
    setLoading(true);
    try {
      await api.post('/clinicas', { nome: nome.trim(), nome_dra: nomeDra.trim() || undefined });
      onCreated();
      onClose();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-white">Nova Clínica</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Nome da clínica</label>
          <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Bella Estética SP"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50" />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Nome da Dra.</label>
          <input value={nomeDra} onChange={e => setNomeDra(e.target.value)} placeholder="Ex: Dra. Marina Santos"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/40 hover:bg-white/5 text-sm transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={!nome.trim() || loading}
            className="flex-1 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-40">
            {loading ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteClinicaModal({ clinica, onClose, onDeleted }: { clinica: Clinica; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await api.delete(`/clinicas/${clinica.id}`);
      toast.success(`${clinica.nome} removida`);
      onDeleted();
      onClose();
    } catch {
      toast.error('Erro ao remover clínica');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-rose-400" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white">Remover clínica</h3>
            <p className="text-xs text-white/40 mt-0.5">Esta ação não pode ser desfeita</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <p className="text-sm text-white/60">
          Isso irá excluir permanentemente <span className="text-white font-semibold">{clinica.nome}</span> e todos os seus leads e conversas.
        </p>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/40 hover:bg-white/5 text-sm transition-colors">Cancelar</button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors disabled:opacity-40">
            {loading ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClinicaCard({ clinica, onDelete }: { clinica: Clinica; onDelete: () => void }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-white">{clinica.nome}</h3>
          {clinica.nome_dra && <p className="text-sm text-white/50 mt-0.5">{clinica.nome_dra}</p>}
        </div>
        <button
          onClick={onDelete}
          className="text-white/20 hover:text-rose-400 transition-colors p-1 -mt-1 -mr-1"
          title="Remover clínica"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="space-y-2">
        {clinica.instagram && (
          <div className="flex items-center gap-2 text-white/40">
            <Instagram size={13} />
            <span className="text-xs">{clinica.instagram}</span>
          </div>
        )}
        <div>
          <WaBadge iaAtiva={clinica.ia_ativa} />
        </div>
      </div>
      {clinica.nome_atendente && (
        <p className="text-xs text-white/30">Atendente: <span className="text-white/50">{clinica.nome_atendente}</span></p>
      )}
    </div>
  );
}

export default function ClinicasPage() {
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Clinica | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery<{ data: Clinica[] }>({
    queryKey: ['clinicas-page'],
    queryFn: () => api.get('/clinicas').then(r => r.data),
  });

  const clinicas = data?.data ?? [];

  function handleDeleted() {
    refetch();
    qc.invalidateQueries({ queryKey: ['clinicas-list'] });
  }

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      <PageGlow />
      {showModal && <NovaClinicaModal onClose={() => setShowModal(false)} onCreated={() => refetch()} />}
      {deleteTarget && (
        <DeleteClinicaModal
          clinica={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
      <div className="relative p-8" style={{ zIndex: 1 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Clínicas</h2>
            <p className="text-white/40 text-sm mt-1">{clinicas.length} clínicas cadastradas</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} /> Nova Clínica
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <RefreshCw size={24} className="text-brand-400 animate-spin" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clinicas.map(clinica => (
            <ClinicaCard key={clinica.id} clinica={clinica} onDelete={() => setDeleteTarget(clinica)} />
          ))}
        </div>
      </div>
    </div>
  );
}
