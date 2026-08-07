import { ArrowLeft, CheckCircle2, ChevronDown, Download, Inbox, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSlug } from '../router';
import { api } from '../api';
import type { FormDefinition, Submission } from '../types';

export default function SubmissionsPage() {
  const slug = useSlug();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [items, setItems] = useState<Submission[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const fields = useMemo(() => form?.sections.flatMap(section => section.fields) || [], [form]);
  async function load() {
    setLoading(true);
    const [formResult, submissionsResult] = await Promise.all([api<{ form: FormDefinition }>(`/forms/${slug}`), api<{ submissions: Submission[] }>(`/forms/${slug}/submissions`)]);
    setForm(formResult.form); setItems(submissionsResult.submissions); setLoading(false);
  }
  useEffect(() => { load(); }, [slug]);
  function exportCsv() {
    const headers = ['id', 'fecha', ...fields.map(field => field.name)];
    const rows = items.map(item => [item.id, item.createdAt, ...fields.map(field => Array.isArray(item.values[field.name]) ? (item.values[field.name] as unknown[]).join('|') : item.values[field.name] ?? '')]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${slug}-envios.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <>
    <header className="page-header"><div className="title-with-back"><Link className="icon-button" to={`/forms/${slug}`}><ArrowLeft /></Link><div><span className="eyebrow">Resultados</span><h1>{form?.title || 'Envíos'}</h1><p>{items.length} respuestas guardadas en la plataforma.</p></div></div><div className="inline-actions"><button className="button button-secondary" onClick={load}><RefreshCw size={17} />Actualizar</button><button className="button button-primary" disabled={!items.length} onClick={exportCsv}><Download size={17} />Exportar CSV</button></div></header>
    <section className="content-card submissions-card">{loading ? <div className="center-state"><span className="spinner" />Cargando envíos…</div> : items.length === 0 ? <div className="empty-state"><Inbox size={36} /><h2>Aún no hay envíos</h2><p>Publica el formulario y comparte su URL para empezar a recibir respuestas.</p><Link className="button button-primary" to={`/f/${slug}`} target="_blank">Abrir formulario</Link></div> : <div className="submission-list">
      {items.map(item => <article key={item.id} className={expanded === item.id ? 'expanded' : ''}><button className="submission-summary" onClick={() => setExpanded(expanded === item.id ? null : item.id)} aria-expanded={expanded === item.id}><span className="submission-check"><CheckCircle2 size={19} /></span><span><strong>Envío #{item.id}</strong><small>{new Date(item.createdAt).toLocaleString('es-CO')}</small></span><span className="submission-preview">{fields.slice(0, 2).map(field => <em key={field.name}><b>{field.label}:</b> {String(item.values[field.name] ?? '—')}</em>)}</span><ChevronDown size={19} /></button>
        {expanded === item.id && <div className="submission-detail"><dl>{fields.map(field => <div key={field.name}><dt>{field.label}</dt><dd>{Array.isArray(item.values[field.name]) ? (item.values[field.name] as unknown[]).join(', ') : String(item.values[field.name] ?? '—')}</dd></div>)}</dl>{item.actions.length > 0 && <aside><strong>Automatizaciones</strong>{item.actions.map((action, index) => <span key={index} className={`action-result ${action.status}`}>{String(action.type)} · {String(action.status)}</span>)}</aside>}</div>}
      </article>)}
    </div>}</section>
  </>;
}
