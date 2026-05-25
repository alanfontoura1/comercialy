import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

type Handler = (data: any) => void;

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

let socket: WebSocket | null = null;
const handlers = new Set<Handler>();

function getSocket(): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) return socket;

  socket = new WebSocket(`${WS_URL}/ws`);

  socket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handlers.forEach((h) => h(data));
    } catch {}
  };

  socket.onclose = () => {
    socket = null;
    setTimeout(getSocket, 3000);
  };

  return socket;
}

export function useWebSocket(onMessage: Handler) {
  const token = useAuthStore((s) => s.token);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  const stableHandler = useCallback((data: any) => handlerRef.current(data), []);

  useEffect(() => {
    if (!token) return;
    handlers.add(stableHandler);
    getSocket();
    return () => { handlers.delete(stableHandler); };
  }, [token, stableHandler]);
}
