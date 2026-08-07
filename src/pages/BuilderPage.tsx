import { ArrowDown, ArrowLeft, ArrowUp, Braces, Check, CheckSquare, ChevronDown, CircleDot, Copy, Eye, FileText, GripVertical, Heading2, Link2, List, Mail, Plus, Save, Send, Settings, Smartphone, TextCursorInput, Trash2, Webhook, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSlug } from '../router';
import { api } from '../api';
import type { FieldType, FormAction, FormDefinition, FormField, FormSection } from '../types';
import Toast from '../components/Toast';

const fieldCatalog: Array<{ type: FieldType; label: string; icon: typeof TextCursorInput }> = [
  { type: 'text', label: 'Texto corto', icon: TextCursorInput }, { type: 'textarea', label: 'Texto largo', icon: FileText },
  { type: 'email', label: 'Correo', icon: Mail }, { type: 'tel', label: 'Teléfono', icon: Smartphone },
  { type: 'number', label: 'Número', icon: Heading2 }, { type: 'date', label: 'Fecha', icon: ChevronDown },
  { type: 'select', label: 'Lista', icon: List }, { type: 'radio', label: 'Opción única', icon: CircleDot },
  { type: 'checkbox', label: 'Casillas', icon: CheckSquare },
];
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const id = () => crypto.randomUUID().slice(0, 8);

function newField(type: FieldType, label: string): FormField {
  const options = ['select', 'radio', 'checkbox'].includes(type) ? [{ label: 'Opción 1', value: 'opcion-1' }, { label: 'Opción 2', value: 'opcion-2' }] : [];
  return { id: `campo-${id()}`, type, name: `campo_${id()}`, label, description: '', placeholder: '', required: false, options };
}

export default function BuilderPage() {
  const slug = useSlug();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [baseline, setBaseline] = useState('');
  const [tab, setTab] = useState<'build' | 'integrations' | 'settings' | 'api'>('build');
  const [selected, setSelected] = useState<{ sectionId: string; fieldId: string } | null>(null);
  const [activeSection, setActiveSection] = useState('');
  const [functions, setFunctions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api<{ form: FormDefinition }>(`/forms/${slug}`), api<{ functions: string[] }>('/functions')])
      .then(([formResult, fnResult]) => { setForm(formResult.form); setBaseline(JSON.stringify(formResult.form)); setActiveSection(formResult.form.sections[0]?.id || ''); setFunctions(fnResult.functions); })
      .catch(error => setToast({ kind: 'error', message: error.message }));
  }, [slug]);
  const dirty = form ? JSON.stringify(form) !== baseline : false;
  useEffect(() => { const guard = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard); }, [dirty]);
  const selectedField = useMemo(() => {
    if (!form || !selected) return null;
    return form.sections.find(section => section.id === selected.sectionId)?.fields.find(field => field.id === selected.fieldId) || null;
  }, [form, selected]);

  function update(next: Partial<FormDefinition>) { setForm(current => current ? { ...current, ...next } : current); }
  function updateSections(mapper: (sections: FormSection[]) => FormSection[]) { setForm(current => current ? { ...current, sections: mapper(current.sections) } : current); }
  function addField(type: FieldType, label: string) {
    if (!form) return;
    const sectionId = activeSection || form.sections[0]?.id;
    const field = newField(type, label);
    updateSections(sections => sections.map(section => section.id === sectionId ? { ...section, fields: [...section.fields, field] } : section));
    setSelected({ sectionId, fieldId: field.id });
  }
  function patchField(patch: Partial<FormField>) {
    if (!selected) return;
    updateSections(sections => sections.map(section => section.id === selected.sectionId ? { ...section, fields: section.fields.map(field => field.id === selected.fieldId ? { ...field, ...patch } : field) } : section));
  }
  function removeField(sectionId: string, fieldId: string) {
    updateSections(sections => sections.map(section => section.id === sectionId ? { ...section, fields: section.fields.filter(field => field.id !== fieldId) } : section));
    if (selected?.fieldId === fieldId) setSelected(null);
  }
  function moveField(sectionId: string, index: number, direction: -1 | 1) {
    updateSections(sections => sections.map(section => {
      if (section.id !== sectionId) return section;
      const target = index + direction; if (target < 0 || target >= section.fields.length) return section;
      const fields = [...section.fields]; [fields[index], fields[target]] = [fields[target], fields[index]]; return { ...section, fields };
    }));
  }
  function addSection() {
    const section: FormSection = { id: `seccion-${id()}`, title: 'Nueva sección', description: '', fields: [] };
    updateSections(sections => [...sections, section]); setActiveSection(section.id);
  }
  function patchSection(sectionId: string, patch: Partial<FormSection>) { updateSections(sections => sections.map(section => section.id === sectionId ? { ...section, ...patch } : section)); }
  async function save() {
    if (!form) return; setBusy(true);
    try { const result = await api<{ form: FormDefinition }>(`/forms/${slug}`, { method: 'PUT', body: JSON.stringify(form) }); setForm(result.form); setBaseline(JSON.stringify(result.form)); setToast({ kind: 'success', message: 'Formulario guardado.' }); }
    catch (error) { setToast({ kind: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar.' }); }
    finally { setBusy(false); }
  }
  async function deleteForm() {
    if (!confirm('¿Eliminar este formulario y todos sus borradores y envíos? Esta acción no se puede deshacer.')) return;
    await api(`/forms/${slug}`, { method: 'DELETE' }); navigate('/');
  }

  if (!form) return <div className="center-state"><span className="spinner" />Cargando constructor…</div>;
  return <div className="builder-page">
    <header className="builder-header">
      <div className="builder-title"><Link className="icon-button" to="/" aria-label="Volver a formularios"><ArrowLeft size={20} /></Link><div><span className="eyebrow">Editando formulario</span><h1>{form.title}</h1></div><em className={`status-badge status-${form.status}`}>{form.status === 'active' ? 'Publicado' : form.status === 'draft' ? 'Borrador' : 'Archivado'}</em></div>
      <div className="builder-actions"><span className={`save-indicator ${dirty ? 'pending' : ''}`}>{dirty ? 'Cambios sin guardar' : <><Check size={15} />Al día</>}</span><Link className="button button-secondary" to={`/f/${form.slug}`} target="_blank"><Eye size={18} />Vista previa</Link><button className="button button-primary" onClick={save} disabled={busy || !dirty}><Save size={18} />{busy ? 'Guardando…' : 'Guardar'}</button></div>
    </header>
    <nav className="builder-tabs" aria-label="Secciones del editor">
      <button className={tab === 'build' ? 'active' : ''} onClick={() => setTab('build')}><FileText size={17} />Constructor</button>
      <button className={tab === 'integrations' ? 'active' : ''} onClick={() => setTab('integrations')}><Webhook size={17} />Integraciones</button>
      <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings size={17} />Configuración</button>
      <button className={tab === 'api' ? 'active' : ''} onClick={() => setTab('api')}><Braces size={17} />API</button>
      <Link to={`/forms/${form.slug}/submissions`}><Send size={17} />Envíos</Link>
    </nav>
    {tab === 'build' && <div className="builder-workspace">
      <aside className="field-palette"><div><span className="eyebrow">Componentes</span><h2>Agregar campo</h2><p>El campo se añade a la sección activa.</p></div><div className="palette-grid">{fieldCatalog.map(item => <button key={item.type} onClick={() => addField(item.type, item.label)}><item.icon size={19} /><span>{item.label}</span><Plus size={15} /></button>)}</div></aside>
      <main className="builder-canvas"><div className="canvas-head"><div><span className="eyebrow">Lienzo</span><h2>{form.title}</h2><p>{form.description || 'Sin descripción todavía.'}</p></div><span>{form.sections.reduce((count, section) => count + section.fields.length, 0)} campos</span></div>
        {form.sections.map((section, sectionIndex) => <section className={`section-card ${activeSection === section.id ? 'active' : ''}`} key={section.id} onClick={() => setActiveSection(section.id)}>
          <div className="section-card-head"><span className="section-number">{sectionIndex + 1}</span><div className="editable-heading"><input aria-label="Nombre de sección" value={section.title} onChange={event => patchSection(section.id, { title: event.target.value })} /><input aria-label="Descripción de sección" value={section.description} placeholder="Descripción opcional" onChange={event => patchSection(section.id, { description: event.target.value })} /></div><button className="icon-button danger" aria-label="Eliminar sección" disabled={form.sections.length === 1} onClick={() => updateSections(sections => sections.filter(item => item.id !== section.id))}><Trash2 size={17} /></button></div>
          <div className="field-stack">{section.fields.length === 0 ? <button className="drop-placeholder" onClick={() => addField('text', 'Texto corto')}><Plus size={20} />Agrega el primer campo de esta sección</button> : section.fields.map((field, index) => <article key={field.id} className={`canvas-field ${selected?.fieldId === field.id ? 'selected' : ''}`} onClick={event => { event.stopPropagation(); setSelected({ sectionId: section.id, fieldId: field.id }); setActiveSection(section.id); }}>
            <GripVertical className="drag-handle" size={18} /><div className="field-preview"><label>{field.label}{field.required && <b>*</b>}</label>{field.type === 'textarea' ? <textarea disabled placeholder={field.placeholder || 'Respuesta larga'} /> : field.type === 'select' ? <select disabled><option>{field.placeholder || 'Selecciona una opción'}</option></select> : ['radio', 'checkbox'].includes(field.type) ? <div className="mini-options">{field.options.map(option => <span key={option.value}><i />{option.label}</span>)}</div> : <input disabled type={field.type} placeholder={field.placeholder || 'Respuesta'} />}{field.description && <small>{field.description}</small>}</div>
            <div className="field-actions"><button className="icon-button" disabled={index === 0} aria-label="Subir campo" onClick={event => { event.stopPropagation(); moveField(section.id, index, -1); }}><ArrowUp size={16} /></button><button className="icon-button" disabled={index === section.fields.length - 1} aria-label="Bajar campo" onClick={event => { event.stopPropagation(); moveField(section.id, index, 1); }}><ArrowDown size={16} /></button><button className="icon-button danger" aria-label="Eliminar campo" onClick={event => { event.stopPropagation(); removeField(section.id, field.id); }}><Trash2 size={16} /></button></div>
          </article>)}</div>
        </section>)}
        <button className="add-section" onClick={addSection}><Plus size={19} />Agregar sección</button>
      </main>
      <aside className="property-panel">{selectedField ? <><div className="property-head"><div><span className="eyebrow">Propiedades</span><h2>{selectedField.label}</h2></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Cerrar propiedades"><X size={18} /></button></div>
        <label>Etiqueta<input value={selectedField.label} onChange={event => patchField({ label: event.target.value })} /></label><label>Identificador<input value={selectedField.name} onChange={event => patchField({ name: slugify(event.target.value) })} /><small>Clave usada en JSON y webhooks.</small></label><label>Tipo<select value={selectedField.type} onChange={event => patchField({ type: event.target.value as FieldType })}>{fieldCatalog.map(item => <option value={item.type} key={item.type}>{item.label}</option>)}</select></label><label>Texto de ayuda<textarea value={selectedField.description} onChange={event => patchField({ description: event.target.value })} /></label><label>Placeholder<input value={selectedField.placeholder} onChange={event => patchField({ placeholder: event.target.value })} /></label><label className="switch-row"><span><strong>Campo obligatorio</strong><small>Impide avanzar si está vacío.</small></span><input type="checkbox" checked={selectedField.required} onChange={event => patchField({ required: event.target.checked })} /></label>
        {['select', 'radio', 'checkbox'].includes(selectedField.type) && <div className="option-editor"><label>Opciones</label>{selectedField.options.map((option, index) => <div key={index}><input aria-label={`Opción ${index + 1}`} value={option.label} onChange={event => { const options = [...selectedField.options]; options[index] = { label: event.target.value, value: slugify(event.target.value).replaceAll('_', '-') }; patchField({ options }); }} /><button className="icon-button danger" onClick={() => patchField({ options: selectedField.options.filter((_, itemIndex) => itemIndex !== index) })}><X size={15} /></button></div>)}<button className="button button-quiet" onClick={() => patchField({ options: [...selectedField.options, { label: `Opción ${selectedField.options.length + 1}`, value: `opcion-${selectedField.options.length + 1}` }] })}><Plus size={16} />Agregar opción</button></div>}
      </> : <div className="property-empty"><TextCursorInput size={28} /><h3>Selecciona un campo</h3><p>Sus propiedades aparecerán aquí para que puedas configurarlo.</p></div>}</aside>
    </div>}
    {tab === 'integrations' && <Integrations form={form} functions={functions} onChange={actions => update({ actions })} />}
    {tab === 'settings' && <SettingsPanel form={form} onChange={update} onDelete={deleteForm} />}
    {tab === 'api' && <ApiPanel form={form} onCopy={message => setToast({ kind: 'success', message })} />}
    {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
  </div>;
}

function Integrations({ form, functions, onChange }: { form: FormDefinition; functions: string[]; onChange: (actions: FormAction[]) => void }) {
  const actions = form.actions || [];
  function patch(index: number, next: Partial<FormAction>) { onChange(actions.map((action, itemIndex) => itemIndex === index ? { ...action, ...next } as FormAction : action)); }
  return <div className="tab-content narrow"><div className="tab-intro"><span className="eyebrow">Automatización</span><h2>Integraciones del formulario</h2><p>Se ejecutan después de guardar el envío. Un fallo externo no elimina la información recibida.</p></div>
    <div className="integration-list">{actions.map((action, index) => <article className="integration-card" key={action.id}><span className="integration-icon">{action.type === 'webhook' ? <Webhook /> : <Braces />}</span><div className="integration-body"><div className="integration-title"><div><h3>{action.type === 'webhook' ? 'Webhook HTTP' : 'Función PHP'}</h3><p>{action.type === 'webhook' ? 'Envía el payload a otro sistema con firma HMAC opcional.' : 'Ejecuta una función registrada en backend/config/functions.php.'}</p></div><label className="toggle"><input type="checkbox" checked={action.enabled} onChange={event => patch(index, { enabled: event.target.checked })} /><span /></label></div>
      {action.type === 'webhook' ? <div className="integration-fields"><label>Método<select value={action.method} onChange={event => patch(index, { method: event.target.value as 'POST' | 'PUT' | 'PATCH' })}><option>POST</option><option>PUT</option><option>PATCH</option></select></label><label className="grow">URL<input type="url" value={action.url} placeholder="https://api.ejemplo.com/webhooks" onChange={event => patch(index, { url: event.target.value })} /></label><label>Secreto de firma<input type="password" value={action.secret} placeholder="Opcional" onChange={event => patch(index, { secret: event.target.value })} /></label></div> : <label>Función permitida<select value={action.functionName} onChange={event => patch(index, { functionName: event.target.value })}><option value="">Selecciona una función</option>{functions.map(name => <option key={name}>{name}</option>)}</select></label>}
    </div><button className="icon-button danger" aria-label="Eliminar integración" onClick={() => onChange(actions.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={18} /></button></article>)}
      {actions.length === 0 && <div className="empty-state compact"><Link2 size={30} /><h3>Sin integraciones</h3><p>Los envíos ya se guardan en la base de datos. Añade acciones solo cuando necesites conectar otro proceso.</p></div>}
    </div><div className="inline-actions"><button className="button button-secondary" onClick={() => onChange([...actions, { id: `webhook-${id()}`, type: 'webhook', enabled: false, url: '', method: 'POST', secret: '' }])}><Webhook size={18} />Agregar webhook</button><button className="button button-secondary" onClick={() => onChange([...actions, { id: `funcion-${id()}`, type: 'server_function', enabled: false, functionName: functions[0] || '' }])}><Braces size={18} />Agregar función PHP</button></div>
  </div>;
}

function SettingsPanel({ form, onChange, onDelete }: { form: FormDefinition; onChange: (next: Partial<FormDefinition>) => void; onDelete: () => void }) {
  return <div className="tab-content settings-layout"><section className="settings-card"><div className="tab-intro"><span className="eyebrow">General</span><h2>Configuración del formulario</h2><p>Controla su publicación, mensajes y comportamiento después del envío.</p></div><div className="settings-grid"><label>Nombre<input value={form.title} onChange={event => onChange({ title: event.target.value })} /></label><label>Identificador<input value={form.slug} disabled /><small>No cambia para mantener estables los endpoints.</small></label><label className="full">Descripción<textarea value={form.description} onChange={event => onChange({ description: event.target.value })} /></label><label>Estado<select value={form.status} onChange={event => onChange({ status: event.target.value as FormDefinition['status'] })}><option value="draft">Borrador</option><option value="active">Publicado</option><option value="archived">Archivado</option></select></label><label>Vigencia del borrador<input type="number" min="1" max="90" value={form.draftTtlDays} onChange={event => onChange({ draftTtlDays: Number(event.target.value) })} /></label><label>Texto del botón<input value={form.submitLabel} onChange={event => onChange({ submitLabel: event.target.value })} /></label><label>Mensaje de éxito<input value={form.successMessage} onChange={event => onChange({ successMessage: event.target.value })} /></label><label className="full">Redirección opcional<input type="url" value={form.redirectUrl} placeholder="https://…" onChange={event => onChange({ redirectUrl: event.target.value })} /></label></div></section><section className="danger-zone"><div><h3>Eliminar formulario</h3><p>También elimina sus borradores y envíos. Esta acción es irreversible.</p></div><button className="button button-danger" onClick={onDelete}><Trash2 size={18} />Eliminar</button></section></div>;
}

function ApiPanel({ form, onCopy }: { form: FormDefinition; onCopy: (message: string) => void }) {
  const endpoints = form.endpoints || { schema: '', submit: '', drafts: '' };
  return <div className="tab-content narrow"><div className="tab-intro"><span className="eyebrow">API REST</span><h2>Endpoints de {form.title}</h2><p>El esquema y el envío son públicos cuando el formulario está publicado. La consulta de resultados requiere token administrativo.</p></div>
    <div className="endpoint-list">{[
      ['GET', 'Obtener esquema público', endpoints.schema], ['POST', 'Crear envío', endpoints.submit], ['PUT', 'Guardar borrador', endpoints.drafts], ['GET', 'Consultar envíos', endpoints.submissions || ''],
    ].map(([method, title, url]) => <article key={title}><span className={`method method-${method.toLowerCase()}`}>{method}</span><div><strong>{title}</strong><code>{url}</code></div><button className="icon-button" aria-label={`Copiar ${title}`} onClick={() => { navigator.clipboard.writeText(url); onCopy('Endpoint copiado.'); }}><Copy size={17} /></button></article>)}</div>
    <section className="code-sample"><div><strong>Ejemplo de envío</strong><small>Content-Type: application/json</small></div><pre>{JSON.stringify({ values: Object.fromEntries(form.sections.flatMap(section => section.fields).slice(0, 3).map(field => [field.name, `valor_${field.name}`])) }, null, 2)}</pre></section>
  </div>;
}
