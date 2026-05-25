import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Kanban, MessageSquare, Building2, Settings2, Smartphone, BarChart3, CalendarDays, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useClinicaStore } from '../store/clinicaStore';
import api from '../services/api';
import clsx from 'clsx';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/kanban', icon: Kanban, label: 'Kanban', end: false },
  { to: '/conversas', icon: MessageSquare, label: 'Conversas', end: false },
  { to: '/agenda', icon: CalendarDays, label: 'Agenda', end: false },
  { to: '/clinicas', icon: Building2, label: 'Clínicas', end: false },
  { to: '/setup', icon: Settings2, label: 'Setup da Clínica', end: false },
  { to: '/whatsapp', icon: Smartphone, label: 'WhatsApp', end: false },
  { to: '/metricas', icon: BarChart3, label: 'Métricas', end: false },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { selectedId, setSelected } = useClinicaStore();
  const navigate = useNavigate();

  const { data: clinicasData } = useQuery<{ data: { id: string; nome: string }[] }>({
    queryKey: ['clinicas-list'],
    queryFn: () => api.get('/clinicas').then(r => r.data),
  });

  const clinicas = clinicasData?.data ?? [];

  // Auto-select first clinic when loaded
  useEffect(() => {
    if (clinicas.length > 0 && (!selectedId || !clinicas.find(c => c.id === selectedId))) {
      setSelected(clinicas[0].id);
    }
  }, [clinicas]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#07060f' }}>
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col sidebar-bg">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <h1 className="font-display text-lg font-bold text-brand-400 tracking-tight">Comercialy</h1>
          <p className="text-xs text-white/30 mt-0.5">Atendimento com IA</p>
        </div>

        {/* Clinic selector */}
        <div className="px-3 py-3 border-b border-white/5">
          <select
            value={selectedId || ''}
            onChange={e => setSelected(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-brand-500/50 cursor-pointer"
          >
            {clinicas.length === 0 && (
              <option value="" style={{ background: '#1a1025' }}>Carregando...</option>
            )}
            {clinicas.map(c => (
              <option key={c.id} value={c.id} style={{ background: '#1a1025' }}>{c.nome}</option>
            ))}
          </select>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-900/40'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              )}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-white/70 truncate">{user?.name ?? 'Usuário'}</p>
            <p className="text-xs text-white/30 truncate">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
