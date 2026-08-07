import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';
import { usePath } from './router';
import type { User } from './types';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BuilderPage from './pages/BuilderPage';
import SubmissionsPage from './pages/SubmissionsPage';
import PublicFormPage from './pages/PublicFormPage';
import InventoryModulePage from './pages/InventoryModulePage';
import InventoryRuntimePage from './pages/InventoryRuntimePage';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const path = usePath();

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api<{ user: User }>('/auth/me').then(result => setUser(result.user)).catch(() => setToken('')).finally(() => setLoading(false));
  }, []);

  if (path.startsWith('/f/')) return <PublicFormPage />;
  if (loading) return <div className="center-state"><span className="spinner" />Verificando sesión…</div>;
  if (!user) return <LoginPage onLogin={setUser} />;
  if (path === '/modules/inventory/run') return <InventoryRuntimePage />;

  return (
    <Layout user={user} onLogout={() => { setToken(''); setUser(null); }}>
      {path === '/' ? <DashboardPage /> : path === '/modules/inventory' ? <InventoryModulePage /> : path.endsWith('/submissions') ? <SubmissionsPage /> : path.startsWith('/forms/') ? <BuilderPage /> : <DashboardPage />}
    </Layout>
  );
}

export default App;
