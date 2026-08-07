import { ArrowLeft, ArrowRight, Clock3, FilePenLine, Plus, Send, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { Link, useNavigate } from '../router';

interface InventoryRecord { id: number; property: string; type: string; sent: string; updatedAt: string }

export default function InventoryModulePage() {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryId, setInventoryId] = useState('');
  const navigate = useNavigate();
  useEffect(() => { api<{ records: InventoryRecord[] }>('/modules/inventory/recent?limit=12').then(result => setRecords(result.records)).finally(() => setLoading(false)); }, []);
  function openExisting(event: FormEvent, mode: 'edit' | 'send') {
    event.preventDefault();
    if (Number(inventoryId) > 0) navigate(`/modules/inventory/run?mode=${mode}&id_inventario=${Number(inventoryId)}`);
  }
  return <>
    <header className="page-header inventory-module-header"><div className="title-with-back"><Link className="icon-button" to="/" aria-label="Volver"><ArrowLeft /></Link><div><span className="eyebrow">Módulo especializado</span><h1>Inventario inmobiliario</h1><p>Opera directamente sobre la base actual, sin cargar WordPress.</p></div></div><span className="migration-pill"><ShieldCheck size={16} />Base compartida protegida</span></header>
    <form className="inventory-open-form" onSubmit={event => openExisting(event, 'edit')}><div><strong>Abrir un inventario existente</strong><span>Escribe el ID para editarlo o completar su envío.</span></div><label><span className="sr-only">ID del inventario</span><input type="number" min="1" inputMode="numeric" placeholder="ID del inventario" value={inventoryId} onChange={event => setInventoryId(event.target.value)} required /></label><button className="button button-secondary" type="submit"><FilePenLine size={16} />Editar</button><button className="button button-primary" type="button" disabled={!Number(inventoryId)} onClick={event => openExisting(event, 'send')}><Send size={16} />Enviar</button></form>
    <section className="inventory-mode-grid">
      <Link to="/modules/inventory/run?mode=add"><span className="mode-icon add"><Plus /></span><div><small>Nuevo proceso</small><h2>Añadir inventario</h2><p>Crea el inventario, actualiza contrato, inmueble y ticket según las reglas existentes.</p></div><ArrowRight /></Link>
      <article><span className="mode-icon edit"><FilePenLine /></span><div><small>Corrección</small><h2>Editar inventario</h2><p>Indica arriba el ID o elige Editar en la lista de registros recientes.</p></div></article>
      <article><span className="mode-icon send"><Send /></span><div><small>Cierre del flujo</small><h2>Enviar inventario</h2><p>Indica arriba el ID o elige Enviar en la lista de registros recientes.</p></div></article>
    </section>
    <section className="content-card recent-inventory">
      <div className="card-toolbar"><div><h2>Inventarios recientes</h2><p>Datos leídos desde <code>wp_jet_cct_inventario</code>.</p></div><span>{records.length} mostrados</span></div>
      {loading ? <div className="center-state"><span className="spinner" />Consultando inventarios…</div> : records.length === 0 ? <div className="empty-state"><p>No hay registros disponibles en este entorno.</p></div> : <div className="inventory-list">
        {records.map(record => <article key={record.id}><div><strong>#{record.id}</strong><span>{record.property || 'Inmueble sin dirección'}</span><small>{record.type || 'Inventario'} · {record.sent === 'Si' ? 'Enviado' : 'Pendiente de envío'}</small></div><span className="record-date"><Clock3 size={14} />{record.updatedAt || 'Sin fecha'}</span><div className="record-actions"><Link to={`/modules/inventory/run?mode=edit&id_inventario=${record.id}`}>Editar</Link><Link to={`/modules/inventory/run?mode=send&id_inventario=${record.id}`}>Enviar</Link></div></article>)}
      </div>}
    </section>
  </>;
}
