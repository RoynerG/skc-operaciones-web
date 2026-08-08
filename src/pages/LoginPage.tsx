import { ArrowRight, CheckCircle2, Layers3, LockKeyhole, Workflow } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, setToken } from '../api';
import type { User } from '../types';
import { useBranding } from '../branding';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const branding = useBranding();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const result = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }, true);
      setToken(result.token); onLogin(result.user);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión.'); }
    finally { setBusy(false); }
  }
  return <div className="login-shell">
    <section className="login-story">
      <div className="brand brand-light"><BrandLogo className="brand-logo-login" /><span className="brand-copy"><strong>{branding.productName}</strong><small>{branding.organizationName}</small></span></div>
      <div className="story-copy"><span className="eyebrow">Migración fuera de WordPress</span><h1>Tus formularios operativos, reunidos en una sola app.</h1><p>Cada proceso conserva su lógica especializada y trabaja directamente con la base de datos actual.</p>
        <ul><li><Layers3 /><span><strong>Módulos independientes</strong><small>Inventario primero; los siguientes procesos se incorporan sobre la misma base.</small></span></li><li><Workflow /><span><strong>Automatizaciones nativas</strong><small>Endpoints PHP, eventos y notificaciones sin depender de hooks de WordPress.</small></span></li><li><CheckCircle2 /><span><strong>Trabajo confiable</strong><small>Borradores locales y del servidor para no perder capturas extensas.</small></span></li></ul>
      </div>
      <small className="story-footer">PHP nativo · React + Vite · API REST</small>
    </section>
    <section className="login-panel"><form className="login-card" onSubmit={submit}>
      <div className="login-mobile-brand"><BrandLogo /><span><strong>{branding.productName}</strong><small>{branding.organizationName}</small></span></div>
      <div className="login-icon"><LockKeyhole size={24} /></div><span className="eyebrow">Acceso operativo</span><h2>Bienvenido de nuevo</h2><p>Ingresa para trabajar con los módulos autorizados.</p>
      <label>Usuario de otras aplicaciones<input type="text" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required /></label>
      <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      {error && <div className="inline-error" role="alert">{error}</div>}
      <button className="button button-primary button-wide" disabled={busy}>{busy ? <span className="spinner small" /> : null}{busy ? 'Ingresando…' : 'Ingresar'}{!busy && <ArrowRight size={18} />}</button>
      <small className="login-help">Usa las mismas credenciales de las otras aplicaciones de SKC.</small>
    </form></section>
  </div>;
}
