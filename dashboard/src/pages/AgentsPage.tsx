import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Bot, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface Agent {
  id: string;
  name: string;
  model: string;
  temperature: number;
  active: boolean;
}

interface AgentForm {
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
}

const MODELS = [
  { value: 'gemini-2.0-flash',  label: 'Gemini 2.0 Flash (Grátis, Rápido)' },
  { value: 'gemini-1.5-flash',  label: 'Gemini 1.5 Flash (Grátis)' },
  { value: 'gemini-1.5-pro',    label: 'Gemini 1.5 Pro (Grátis, Avançado)' },
];

function AgentModal({ onClose, onSave }: { onClose: () => void; onSave: (data: AgentForm) => void }) {
  const [form, setForm] = useState<AgentForm>({
    name: '',
    system_prompt: 'Você é um assistente comercial prestativo. Responda de forma clara, objetiva e sempre em português.',
    model: 'gemini-2.0-flash',
    temperature: 0.7,
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-800 p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-100">Novo Agente IA</h3>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Nome do agente</label>
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Ex: Assistente Comercial"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Prompt do sistema</label>
          <textarea
            rows={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            value={form.system_prompt}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Modelo</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            >
              {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Temperatura: {form.temperature}</label>
            <input
              type="range" min="0" max="1" step="0.1"
              className="w-full mt-3"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors">Cancelar</button>
          <button
            onClick={() => { if (!form.name || !form.system_prompt) { toast.error('Preencha todos os campos'); return; } onSave(form); }}
            className="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors"
          >
            Criar Agente
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data } = useQuery({ queryKey: ['agents'], queryFn: () => api.get('/agents').then(r => r.data.data as Agent[]) });

  const createMutation = useMutation({
    mutationFn: (body: AgentForm) => api.post('/agents', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); setShowModal(false); toast.success('Agente criado!'); },
    onError: () => toast.error('Erro ao criar agente'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.put(`/agents/${id}`, { active: !active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/agents/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); toast.success('Agente removido'); },
  });

  return (
    <div className="p-8">
      {showModal && <AgentModal onClose={() => setShowModal(false)} onSave={(d) => createMutation.mutate(d)} />}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Agentes IA</h2>
          <p className="text-gray-400 mt-1">Configure os assistentes que respondem seus clientes</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors">
          <Plus size={18} /> Novo Agente
        </button>
      </div>

      <div className="grid gap-4">
        {!data?.length ? (
          <div className="bg-gray-900 rounded-xl p-10 border border-gray-800 text-center">
            <Bot size={40} className="text-brand-500 mx-auto mb-3 opacity-50" />
            <p className="text-gray-400">Nenhum agente criado. Crie seu primeiro agente IA!</p>
          </div>
        ) : data.map((agent) => (
          <div key={agent.id} className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-600/20 flex items-center justify-center">
              <Bot size={20} className="text-brand-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-100">{agent.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{agent.model} · temp {agent.temperature}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleMutation.mutate({ id: agent.id, active: agent.active })} className="text-gray-400 hover:text-brand-400 transition-colors">
                {agent.active ? <ToggleRight size={22} className="text-brand-400" /> : <ToggleLeft size={22} />}
              </button>
              <button onClick={() => { if (confirm('Remover agente?')) deleteMutation.mutate(agent.id); }} className="text-gray-400 hover:text-red-400 transition-colors p-1">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
