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
import { applyBranding, BrandingProvider, defaultBranding, type BrandingConfig } from './branding';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const path = usePath();

  useEffect(() => {
    applyBranding(defaultBranding);
    api<BrandingConfig>('/branding', {}, true).then(result => {
      const next = { ...defaultBranding, ...result, colors: { ...defaultBranding.colors, ...(result.colors || {}) } };
      setBranding(next);
      applyBranding(next);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api<{ user: User }>('/auth/me').then(result => setUser(result.user)).catch(() => setToken('')).finally(() => setLoading(false));
  }, []);

  let content;
  if (path.startsWith('/f/')) content = <PublicFormPage />;
  else if (loading) content = <div className="center-state"><span className="spinner" />Verificando sesión…</div>;
  else if (!user) content = <LoginPage onLogin={setUser} />;
  else if (path === '/modules/inventory/run') content = <InventoryRuntimePage />;
  else content = <Layout user={user} onLogout={() => { setToken(''); setUser(null); }}>
    {path === '/' ? <DashboardPage /> : path === '/modules/inventory' ? <InventoryModulePage /> : path.endsWith('/submissions') ? <SubmissionsPage /> : path.startsWith('/forms/') ? <BuilderPage /> : <DashboardPage />}
  </Layout>;

  return <BrandingProvider value={branding}>{content}</BrandingProvider>;
}

export default App;
