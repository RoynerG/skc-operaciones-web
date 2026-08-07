import { ArrowRight, Boxes, CheckCircle2, FilePlus2, Layers3, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Link } from '../router';

interface ModuleDescriptor {
  slug: string; title: string; description: string; status: string; records: number;
  modes: string[]; capabilities: string[];
}

export default function DashboardPage() {
  const [modules, setModules] = useState<ModuleDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ modules: ModuleDescriptor[] }>('/modules')
      .then(result => setModules(result.modules))
      .catch(reason => setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los módulos.'))
      .finally(() => setLoading(false));
  }, []);

  return <>
    <header className="page-header operations-header">
      <div><span className="eyebrow">Centro de operaciones</span><h1>Formularios especializados</h1><p>Cada módulo conserva sus propias reglas, endpoints y automatizaciones.</p></div>
      <span className="migration-pill"><CheckCircle2 size={16} />PHP + React, sin WordPress</span>
    </header>
    <section className="operations-hero">
      <div><span className="eyebrow">Migración progresiva</span><h2>Una sola app para todos tus procesos</h2><p>Empezamos con Inventario conectado a las tablas actuales. Los siguientes formularios se añadirán como módulos independientes, sin volver a construir la plataforma.</p></div>
      <span className="operations-hero-icon"><Layers3 /></span>
    </section>
    <section className="module-section">
      <div className="section-title"><div><h2>Módulos disponibles</h2><p>Abre un proceso o consulta su actividad reciente.</p></div><span>{modules.length} activo</span></div>
      {loading ? <div className="center-state"><span className="spinner" />Consultando módulos…</div> : error ? <div className="empty-state"><p>{error}</p></div> :
        <div className="module-grid">
          {modules.map(module => <article className="module-card" key={module.slug}>
            <div className="module-card-top"><span className="module-icon"><Boxes /></span><em>Activo</em></div>
            <h3>{module.title}</h3><p>{module.description}</p>
            <div className="module-stats"><span><strong>{module.records}</strong> registros actuales</span><span>{module.modes.length} flujos</span></div>
            <div className="module-tags">{module.capabilities.slice(0, 4).map(capability => <span key={capability}>{capability}</span>)}</div>
            <Link className="button button-primary button-wide" to={`/modules/${module.slug}`}><span>Abrir módulo</span><ArrowRight size={17} /></Link>
          </article>)}
          <article className="module-card module-card-future"><span className="module-icon"><FilePlus2 /></span><h3>Próximo formulario</h3><p>La base ya está lista para registrar otro proceso con su propio esquema y endpoints.</p><span className="future-note"><Sparkles size={15} />Se añadirá cuando me indiques cuál sigue</span></article>
        </div>}
    </section>
  </>;
}
