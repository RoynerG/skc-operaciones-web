import { ArrowLeft, ArrowRight, Check, CheckCircle2, Cloud, CloudOff, FileText } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSlug } from '../router';
import { ApiError, api, clientId } from '../api';
import type { FormDefinition, FormField } from '../types';

const draftKeyFor = (slug: string) => {
  const query = new URLSearchParams(location.search).get('draft');
  if (query && /^[a-zA-Z0-9_-]{8,100}$/.test(query)) return query;
  const key = `skc-draft-${slug}`; let value = localStorage.getItem(key);
  if (!value) { value = crypto.randomUUID().replaceAll('-', ''); localStorage.setItem(key, value); }
  return value;
};
const empty = (value: unknown) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

export default function PublicFormPage() {
  const slug = useSlug();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [sectionIndex, setSectionIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'loading' | 'saved' | 'pending' | 'offline' | 'error'>('loading');
  const [message, setMessage] = useState('Preparando formulario…');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const valuesRef = useRef(values); const revisionRef = useRef(0); const timerRef = useRef<number | undefined>(undefined);
  const draftKey = useMemo(() => draftKeyFor(slug), [slug]);
  const client = useMemo(() => clientId(), []);
  const localKey = `skc-local-draft-${slug}-${draftKey}`;

  useEffect(() => {
    api<{ form: FormDefinition }>(`/public/forms/${slug}`, {}, true).then(async result => {
      setForm(result.form);
      const local = JSON.parse(localStorage.getItem(localKey) || '{}');
      let recovered = local.values || {};
      try {
        const server = await api<{ draft: { revision: number; values: Record<string, unknown> } | null }>(`/public/forms/${slug}/drafts/${draftKey}`, { headers: { 'X-Form-Client': client } }, true);
        if (server.draft) { revisionRef.current = server.draft.revision; recovered = { ...recovered, ...server.draft.values }; }
      } catch { setMessage('Trabajando con el borrador local.'); }
      valuesRef.current = recovered; setValues(recovered); setStatus('saved'); setMessage(Object.keys(recovered).length ? 'Borrador recuperado' : 'Borrador listo');
    }).catch(error => { setStatus('error'); setMessage(error.message); });
  }, [slug, draftKey, client, localKey]);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  function change(name: string, value: unknown) {
    const next = { ...valuesRef.current, [name]: value }; valuesRef.current = next; setValues(next); setErrors(current => ({ ...current, [name]: '' })); setStatus('pending'); setMessage('Cambios pendientes…');
    localStorage.setItem(localKey, JSON.stringify({ values: next, savedAt: Date.now() }));
    window.clearTimeout(timerRef.current); timerRef.current = window.setTimeout(saveDraft, 1200);
  }
  async function saveDraft() {
    if (!form) return;
    try {
      const result = await api<{ revision: number }>(`/public/forms/${slug}/drafts/${draftKey}`, { method: 'PUT', headers: { 'X-Form-Client': client }, body: JSON.stringify({ revision: revisionRef.current, values: valuesRef.current }) }, true);
      revisionRef.current = result.revision; setStatus('saved'); setMessage('Borrador guardado');
    } catch { setStatus('offline'); setMessage('Guardado en este dispositivo'); }
  }
  function validateSection(index: number) {
    if (!form) return false;
    const found: Record<string, string> = {};
    form.sections[index].fields.forEach(field => { if (field.required && empty(valuesRef.current[field.name])) found[field.name] = 'Este campo es obligatorio.'; });
    setErrors(found); if (Object.keys(found)[0]) document.querySelector(`[data-name="${CSS.escape(Object.keys(found)[0])}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return Object.keys(found).length === 0;
  }
  async function submit() {
    if (!form) return;
    for (let index = 0; index < form.sections.length; index++) { if (!validateSection(index)) { setSectionIndex(index); setMessage('Revisa los campos obligatorios.'); return; } }
    setBusy(true); setMessage('Enviando información…');
    try {
      const result = await api<{ message: string; redirectUrl: string }>(`/public/forms/${slug}/submissions`, { method: 'POST', headers: { 'X-Form-Client': client }, body: JSON.stringify({ values: valuesRef.current, draftKey }) }, true);
      localStorage.removeItem(localKey); setSubmitted(true); setMessage(result.message);
      if (result.redirectUrl) window.setTimeout(() => location.assign(result.redirectUrl), 1200);
    } catch (error) {
      if (error instanceof ApiError && error.details.validation) setErrors(error.details.validation as Record<string, string>);
      setStatus('error'); setMessage(error instanceof Error ? error.message : 'No se pudo enviar.'); setBusy(false);
    }
  }

  if (!form) return <div className="public-shell"><div className={`public-loading ${status === 'error' ? 'error' : ''}`}>{status === 'loading' ? <span className="spinner" /> : <CloudOff />}<p>{message}</p></div></div>;
  if (submitted) return <div className="public-shell"><main className="success-card"><span><CheckCircle2 /></span><h1>¡Listo!</h1><p>{message}</p><small>Ya puedes cerrar esta ventana.</small></main></div>;
  const section = form.sections[sectionIndex];
  return <div className="public-shell"><header className="public-header"><div className="public-brand"><span className="brand-mark">S</span><div><strong>SKC Form Studio</strong><small>Captura segura</small></div></div><div className={`draft-status ${status}`} aria-live="polite">{status === 'saved' ? <Cloud size={17} /> : status === 'pending' ? <span className="spinner small" /> : <CloudOff size={17} />}{message}</div></header>
    <div className="public-progress"><span style={{ width: `${((sectionIndex + 1) / form.sections.length) * 100}%` }} /></div>
    <main className="public-form"><aside><span className="eyebrow">{form.title}</span><h1>{section.title}</h1><p>{section.description || form.description}</p><nav aria-label="Progreso del formulario">{form.sections.map((item, index) => <button key={item.id} className={index === sectionIndex ? 'active' : index < sectionIndex ? 'done' : ''} onClick={() => setSectionIndex(index)}><span>{index < sectionIndex ? <Check size={15} /> : index + 1}</span><em>{item.title}</em></button>)}</nav></aside>
      <section className="public-card"><div className="public-card-head"><span>Sección {sectionIndex + 1} de {form.sections.length}</span><strong>{section.fields.length} {section.fields.length === 1 ? 'campo' : 'campos'}</strong></div><div className="public-fields">{section.fields.map(field => <PublicField key={field.id} field={field} value={values[field.name]} error={errors[field.name]} onChange={value => change(field.name, value)} />)}</div>
        <footer><button className="button button-secondary" disabled={sectionIndex === 0} onClick={() => setSectionIndex(index => index - 1)}><ArrowLeft size={18} />Anterior</button>{sectionIndex < form.sections.length - 1 ? <button className="button button-primary" onClick={() => { if (validateSection(sectionIndex)) setSectionIndex(index => index + 1); }}>Continuar<ArrowRight size={18} /></button> : <button className="button button-primary" disabled={busy} onClick={submit}>{busy ? <span className="spinner small" /> : <Check size={18} />}{busy ? 'Enviando…' : form.submitLabel}</button>}</footer>
      </section></main><footer className="public-footer"><FileText size={15} />Tu progreso se guarda automáticamente en este dispositivo y en el servidor.</footer>
  </div>;
}

function PublicField({ field, value, error, onChange }: { field: FormField; value: unknown; error?: string; onChange: (value: unknown) => void }) {
  const id = `field-${field.id}`;
  let control;
  if (field.type === 'textarea') control = <textarea id={id} rows={4} value={String(value ?? '')} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} />;
  else if (field.type === 'select') control = <select id={id} value={String(value ?? '')} onChange={event => onChange(event.target.value)}><option value="">{field.placeholder || 'Selecciona una opción'}</option>{field.options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>;
  else if (field.type === 'radio') control = <div className="public-options">{field.options.map(option => <label key={option.value}><input type="radio" name={field.name} checked={value === option.value} onChange={() => onChange(option.value)} /><span>{option.label}</span></label>)}</div>;
  else if (field.type === 'checkbox') { const selected = Array.isArray(value) ? value as string[] : []; control = <div className="public-options">{field.options.map(option => <label key={option.value}><input type="checkbox" checked={selected.includes(option.value)} onChange={event => onChange(event.target.checked ? [...selected, option.value] : selected.filter(item => item !== option.value))} /><span>{option.label}</span></label>)}</div>; }
  else control = <input id={id} type={field.type} value={String(value ?? '')} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} />;
  return <div className={`public-field ${error ? 'has-error' : ''}`} data-name={field.name}><label htmlFor={!['radio', 'checkbox'].includes(field.type) ? id : undefined}>{field.label}{field.required && <b> *</b>}</label>{control}{field.description && <small>{field.description}</small>}{error && <em role="alert">{error}</em>}</div>;
}
