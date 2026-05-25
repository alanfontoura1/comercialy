import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock, MessageSquare, RefreshCw } from 'lucide-react';
import { PageGlow } from '../components/ui/PageGlow';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { useClinicaStore } from '../store/clinicaStore';
import { Lead, LeadStatus } from '../types';
import api from '../services/api';
import clsx from 'clsx';
import { displayName, formatPhone } from '../utils/format';

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'novo', label: 'Novo Lead', color: '#6b7280' },
  { id: 'qualificacao', label: 'Em Qualificação', color: '#f59e0b' },
  { id: 'qualificado', label: 'Qualificado', color: '#3b82f6' },
  { id: 'agendado', label: 'Agendado', color: '#8b5cf6' },
  { id: 'convertido', label: 'Convertido', color: '#10b981' },
  { id: 'followup', label: 'Follow-up', color: '#f97316' },
  { id: 'nutricao', label: 'Nutrição', color: '#ec4899' },
  { id: 'arquivado', label: 'Arquivado', color: '#374151' },
];

function LeadCard({ lead, isDragging }: { lead: Lead; isDragging?: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lead.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card p-3 cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors"
    >
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-sm font-semibold text-white leading-tight">
          {displayName(lead.nome, lead.telefone)}
        </p>
        {lead.bloqueado && <Lock size={12} className="text-rose-400 flex-shrink-0 mt-0.5" />}
      </div>
      <p className="text-xs text-white/30 mb-2">{lead.telefone}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <ScoreBadge score={lead.score} />
        {lead.procedimento_interesse && (
          <span className="text-xs bg-brand-500/15 text-brand-400 px-1.5 py-0.5 rounded-full">
            {lead.procedimento_interesse}
          </span>
        )}
      </div>
      <p className="text-xs text-white/20 mt-2">
        {formatDistanceToNow(new Date(lead.data_contato || lead.created_at || new Date()), { locale: ptBR, addSuffix: true })}
      </p>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={() => navigate(`/conversas?lead=${lead.id}`)}
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-white/50 hover:text-brand-400 hover:bg-brand-500/10 border border-white/[0.06] hover:border-brand-500/20 transition-all"
      >
        <MessageSquare size={11} /> Ver conversa
      </button>
    </div>
  );
}

function KanbanColumn({ col, leads }: { col: typeof COLUMNS[0]; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="flex-shrink-0 w-52 flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col.color }} />
        <span className="text-xs font-semibold text-white/70 flex-1 truncate">{col.label}</span>
        <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 min-h-[200px] rounded-xl p-2 space-y-2 transition-colors',
          isOver ? 'bg-brand-500/10 border border-brand-500/30' : 'bg-white/[0.02] border border-white/[0.04]'
        )}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-white/15 text-xs">
            Nenhum lead
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { selectedId } = useClinicaStore();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: leadsData, isLoading } = useQuery<{ data: Lead[] }>({
    queryKey: ['leads-kanban', selectedId],
    queryFn: () => api.get(`/leads?${selectedId ? `clinica_id=${selectedId}&` : ''}limit=200`).then(r => r.data),
    enabled: !!selectedId,
    refetchInterval: 10000,
  });

  const leads = leadsData?.data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      api.patch(`/leads/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads-kanban', selectedId] }),
  });

  // Group leads by status
  const board = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    for (const col of COLUMNS) grouped[col.id] = [];
    for (const lead of leads) {
      const key = lead.status in grouped ? lead.status : 'novo';
      grouped[key].push(lead);
    }
    return grouped;
  }, [leads]);

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  function findSourceColumn(leadId: string): LeadStatus | null {
    for (const col of COLUMNS) {
      if (board[col.id]?.find(l => l.id === leadId)) return col.id;
    }
    return null;
  }

  function findTargetColumn(overId: string): LeadStatus | null {
    const asCol = COLUMNS.find(c => c.id === overId);
    if (asCol) return asCol.id;
    for (const col of COLUMNS) {
      if (board[col.id]?.find(l => l.id === overId)) return col.id;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const sourceCol = findSourceColumn(String(active.id));
    const targetCol = findTargetColumn(String(over.id));

    if (!sourceCol || !targetCol || sourceCol === targetCol) return;

    // Optimistic update + API call
    statusMutation.mutate({ id: String(active.id), status: targetCol });
  }

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      <PageGlow />
      <div className="relative flex flex-col h-screen" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="px-8 py-5 flex items-center gap-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold text-white">Kanban de Leads</h2>
            <p className="text-white/40 text-sm mt-0.5">{leads.length} leads</p>
          </div>
          {isLoading && <RefreshCw size={16} className="text-brand-400 animate-spin" />}
        </div>

        {/* Board */}
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-white/30">
            Selecione uma clínica na sidebar para ver os leads
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto px-6 py-5">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 min-h-full h-max">
                {COLUMNS.map(col => (
                  <KanbanColumn key={col.id} col={col} leads={board[col.id] ?? []} />
                ))}
              </div>

              <DragOverlay>
                {activeLead && (
                  <div className="card p-3 w-52 shadow-2xl shadow-brand-900/50 rotate-1">
                    <p className="text-sm font-semibold text-white">{displayName(activeLead.nome, activeLead.telefone)}</p>
                    <p className="text-xs text-white/30 mt-1">{formatPhone(activeLead.telefone) || activeLead.telefone}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <ScoreBadge score={activeLead.score} />
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}
