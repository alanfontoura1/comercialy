import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, BotOff, Search, User, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import api from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

interface Conversation {
  id: string;
  status: string;
  ai_enabled: boolean;
  contact_name: string | null;
  contact_phone: string;
  last_message: string | null;
  last_message_at: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

function timeAgo(date: string | null) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  } catch {
    return '';
  }
}

function ConvItem({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const name = conv.contact_name || conv.contact_phone;
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-colors',
        active && 'bg-gray-800 border-l-2 border-l-brand-500'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
          <User size={16} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-100 truncate">{name}</span>
            <span className="text-xs text-gray-500 flex-shrink-0">{timeAgo(conv.last_message_at)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-xs text-gray-400 truncate">{conv.last_message || 'Sem mensagens'}</span>
            {conv.ai_enabled
              ? <Bot size={12} className="text-brand-400 flex-shrink-0" />
              : <BotOff size={12} className="text-gray-600 flex-shrink-0" />}
          </div>
        </div>
      </div>
    </button>
  );
}

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={clsx('flex gap-2 mb-3', isUser ? 'justify-start' : 'justify-end')}>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
          <User size={13} className="text-gray-400" />
        </div>
      )}
      <div className={clsx(
        'max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
        isUser ? 'bg-gray-800 text-gray-100 rounded-tl-sm' : 'bg-brand-600 text-white rounded-tr-sm'
      )}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p className={clsx('text-xs mt-1', isUser ? 'text-gray-500' : 'text-brand-200')}>
          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={13} className="text-white" />
        </div>
      )}
    </div>
  );
}

export default function ConversationsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: convData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations').then(r => r.data.data as Conversation[]),
    refetchInterval: 10000,
  });

  const { data: msgData, refetch: refetchMsgs } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => api.get(`/conversations/${selectedId}/messages`).then(r => r.data.data as Message[]),
    enabled: !!selectedId,
  });

  const toggleAI = useMutation({
    mutationFn: (id: string) => api.patch(`/conversations/${id}/toggle-ai`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });

  useWebSocket((data) => {
    if (data.type === 'new_message') {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      if (data.conversationId === selectedId) refetchMsgs();
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgData]);

  const conversations = convData || [];
  const filtered = search
    ? conversations.filter(c =>
        (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
        c.contact_phone.includes(search)
      )
    : conversations;
  const selected = conversations.find(c => c.id === selectedId);
  const messages = msgData || [];

  return (
    <div className="flex h-full">
      {/* Lista de conversas */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900">
        <div className="p-3 border-b border-gray-800">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full bg-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              {conversations.length === 0
                ? 'Nenhuma conversa ainda. Conecte o WhatsApp para começar.'
                : 'Nenhum resultado.'}
            </div>
          ) : filtered.map(conv => (
            <ConvItem
              key={conv.id}
              conv={conv}
              active={selectedId === conv.id}
              onClick={() => setSelectedId(conv.id)}
            />
          ))}
        </div>
      </div>

      {/* Janela do chat */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <Bot size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Selecione uma conversa para visualizar</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center">
                <User size={16} className="text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-100">
                  {selected.contact_name || selected.contact_phone}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Circle size={7} className={clsx(
                    selected.status === 'open'
                      ? 'text-green-400 fill-green-400'
                      : 'text-gray-500 fill-gray-500'
                  )} />
                  <span className="text-xs text-gray-400">
                    {selected.status === 'open' ? 'Aberta' : 'Fechada'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleAI.mutate(selected.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                selected.ai_enabled
                  ? 'bg-brand-600/20 text-brand-400 hover:bg-brand-600/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              {selected.ai_enabled ? <Bot size={16} /> : <BotOff size={16} />}
              IA {selected.ai_enabled ? 'ativada' : 'desativada'}
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-950">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Nenhuma mensagem nesta conversa.
              </div>
            ) : messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
            <div ref={bottomRef} />
          </div>

          {/* Rodapé */}
          <div className="px-6 py-3 border-t border-gray-800 bg-gray-900 text-center">
            <p className="text-xs text-gray-500">
              Mensagens chegam pelo WhatsApp. A IA responde automaticamente quando ativada.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
