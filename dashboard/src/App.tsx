import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import KanbanPage from './pages/KanbanPage';
import ConversasPage from './pages/ConversasPage';
import ClinicasPage from './pages/ClinicasPage';
import SetupClinicaPage from './pages/SetupClinicaPage';
import WhatsAppPage from './pages/WhatsAppPage';
import MetricasPage from './pages/MetricasPage';
import AgendaPage from './pages/AgendaPage';
import ConnectWhatsAppPage from './pages/ConnectWhatsAppPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
    <Toaster position="top-right" toastOptions={{ style: { background: '#1a1025', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' } }} />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/connect/:token" element={<ConnectWhatsAppPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="kanban" element={<KanbanPage />} />
        <Route path="conversas" element={<ConversasPage />} />
        <Route path="clinicas" element={<ClinicasPage />} />
        <Route path="setup" element={<SetupClinicaPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="metricas" element={<MetricasPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
