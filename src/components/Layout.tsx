import { Boxes, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Settings2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, usePath } from '../router';
import type { User } from '../types';

export default function Layout({ user, onLogout, children }: { user: User; onLogout: () => void; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const path = usePath();
  return <div className={`app-frame ${collapsed ? 'nav-collapsed' : ''}`}>
    <aside className="app-sidebar">
      <div className="brand"><span className="brand-mark">S</span><span className="brand-copy"><strong>SKC Operaciones</strong><small>Procesos nativos</small></span></div>
      <nav aria-label="Navegación principal">
        <Link className={path === '/' ? 'active' : ''} to="/"><LayoutDashboard size={20} /><span>Inicio</span></Link>
        <span className="nav-label">Módulos</span>
        <Link className={path.startsWith('/modules/inventory') ? 'active' : ''} to="/modules/inventory"><Boxes size={20} /><span>Inventario</span></Link>
        <span className="nav-label">Sistema</span>
        <button type="button" disabled><Settings2 size={20} /><span>Configuración</span></button>
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div>
        <button className="icon-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}><LogOut size={19} /></button>
      </div>
      <button type="button" className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}>
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </aside>
    <main className="app-main">{children}</main>
  </div>;
}
