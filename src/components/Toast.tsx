import { CheckCircle2, X, XCircle } from 'lucide-react';

export default function Toast({ kind = 'success', message, onClose }: { kind?: 'success' | 'error'; message: string; onClose: () => void }) {
  return <div className={`toast toast-${kind}`} role="status">
    {kind === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
    <span>{message}</span><button className="icon-button" onClick={onClose} aria-label="Cerrar aviso"><X size={17} /></button>
  </div>;
}
