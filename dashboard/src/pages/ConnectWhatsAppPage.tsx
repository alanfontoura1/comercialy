import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

interface ConnectStatus {
  status: 'disconnected' | 'connecting' | 'connected';
  qr: string | null;
  phone: string | null;
  connected: boolean;
  nome: string;
  nome_atendente: string;
  clinicaId: string;
}

export default function ConnectWhatsAppPage() {
  const { token } = useParams<{ token: string }>();

  // Start the instance on mount
  const startMutation = useMutation({
    mutationFn: () => axios.post(`${baseUrl}/baileys/connect/${token}/start`),
  });

  useEffect(() => {
    if (token) startMutation.mutate();
  }, [token]);

  const { data, isLoading, isError } = useQuery<ConnectStatus>({
    queryKey: ['connect-status', token],
    queryFn: () => axios.get(`${baseUrl}/baileys/connect/${token}`).then(r => r.data),
    enabled: !!token,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.connected) return 15000;
      if (d?.status === 'connecting') return 3000;
      return 5000;
    },
  });

  const isConnected = data?.connected;
  const isConnecting = data?.status === 'connecting';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#0d0a1a' }}>
      {/* Logo / brand */}
      <div className="mb-8 text-center">
        <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}>
          <span className="text-xl font-bold" style={{ color: '#8b5cf6' }}>C</span>
        </div>
        <p className="text-white/40 text-sm">Comercialy CRM</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl border p-6 text-center space-y-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>

          {isLoading && (
            <div className="py-10">
              <RefreshCw size={28} className="mx-auto animate-spin" style={{ color: '#8b5cf6' }} />
              <p className="text-white/40 text-sm mt-3">Carregando...</p>
            </div>
          )}

          {isError && !isLoading && (
            <div className="py-10">
              <WifiOff size={32} className="mx-auto text-rose-400 mb-3" />
              <p className="text-rose-400 font-semibold">Link inválido</p>
              <p className="text-white/30 text-sm mt-1">Este link expirou ou é inválido.</p>
            </div>
          )}

          {!isLoading && !isError && data && (
            <>
              <div>
                <h1 className="text-white font-bold text-xl">{data.nome}</h1>
                <p className="text-white/40 text-sm mt-1">
                  Conecte o WhatsApp da {data.nome_atendente || 'atendente'}
                </p>
              </div>

              {/* Connected state */}
              {isConnected && (
                <div className="py-4">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <CheckCircle2 size={30} className="text-emerald-400" />
                  </div>
                  <p className="text-emerald-400 font-semibold text-lg">WhatsApp Conectado!</p>
                  {data.phone && <p className="text-white/40 text-sm mt-1">+{data.phone}</p>}
                  <p className="text-white/30 text-xs mt-3">
                    A IA já está ativa e respondendo mensagens automaticamente.
                  </p>
                </div>
              )}

              {/* Connecting — show QR */}
              {!isConnected && isConnecting && (
                <div className="space-y-4">
                  {data.qr ? (
                    <>
                      <div className="inline-block p-3 rounded-2xl" style={{ background: '#fff' }}>
                        <img src={data.qr} alt="QR Code" className="w-52 h-52 rounded-lg block" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-white font-semibold text-sm">Escaneie com seu WhatsApp</p>
                        <p className="text-white/35 text-xs leading-relaxed">
                          Abra o WhatsApp → toque em <strong className="text-white/50">⋮</strong> → Aparelhos conectados → Conectar aparelho
                        </p>
                      </div>
                      <p className="text-white/20 text-xs">QR atualiza automaticamente a cada 20s</p>
                    </>
                  ) : (
                    <div className="py-6">
                      <RefreshCw size={28} className="mx-auto animate-spin mb-3" style={{ color: '#8b5cf6' }} />
                      <p className="text-white/50 text-sm">Gerando QR Code...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Not started yet */}
              {!isConnected && !isConnecting && (
                <div className="py-6">
                  <WifiOff size={28} className="mx-auto text-white/20 mb-3" />
                  <p className="text-white/40 text-sm">Aguardando conexão...</p>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-white/15 text-xs text-center mt-4">
          Powered by Comercialy CRM
        </p>
      </div>
    </div>
  );
}
