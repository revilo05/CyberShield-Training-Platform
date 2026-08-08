import { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ModuleDetailPage } from './pages/ModuleDetailPage';
import { ModulesPage } from './pages/ModulesPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { SimulationsPage } from './pages/SimulationsPage';
import type { RouteName } from './types';

function ProtectedApp() {
  const { user, loading } = useAuth(); const [route, setRoute] = useState<RouteName>('dashboard'); const [moduleId, setModuleId] = useState('');
  if (loading) return <div className="app-loading"><span className="brand-mark large">C</span><p>Preparando tu centro de riesgo…</p></div>;
  if (!user) return <LoginPage />;
  const navigate = (next: RouteName) => { if (next === 'reports' && user.role === 'EMPLOYEE') { setRoute('dashboard'); return; } setRoute(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const page = route === 'dashboard' ? <DashboardPage navigate={navigate} /> : route === 'modules' ? <ModulesPage openModule={(id) => { setModuleId(id); navigate('module-detail'); }} /> : route === 'module-detail' ? <ModuleDetailPage moduleId={moduleId} back={() => navigate('modules')} /> : route === 'simulations' ? <SimulationsPage /> : route === 'reports' ? <ReportsPage /> : <ProfilePage />;
  return <Layout route={route} navigate={navigate}>{page}</Layout>;
}

export function CyberShieldApp() { return <AuthProvider><ProtectedApp /></AuthProvider>; }
