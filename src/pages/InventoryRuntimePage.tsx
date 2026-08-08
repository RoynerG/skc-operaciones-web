import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { getToken } from '../api';
import { useBranding } from '../branding';

declare global {
  interface Window {
    wp?: { element: typeof React & { createRoot: typeof createRoot } };
    SKCInventoryApp?: Record<string, unknown>;
  }
}

export default function InventoryRuntimePage() {
  const branding = useBranding();
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get('mode') || 'add';
    const mode = ['add', 'edit', 'send'].includes(requested) ? requested : 'add';
    const context: Record<string, string> = {};
    for (const [key, value] of params.entries()) if (key.startsWith('id_') || key === 'numero_solicitud') context[key] = value;
    const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

    window.wp = { element: Object.assign({}, React, { createRoot }) };
    window.SKCInventoryApp = {
      restUrl: `${apiBase}/modules/inventory`, token: getToken(), mode, context,
      aiEnabled: true, redirectUrl: '/modules/inventory', exitUrl: '/modules/inventory',
      branding,
    };

    const runtimeVersion = Date.now();
    let style = document.querySelector<HTMLLinkElement>('link[data-inventory-runtime]');
    if (!style) {
      style = document.createElement('link'); style.rel = 'stylesheet';
      style.dataset.inventoryRuntime = 'true'; document.head.appendChild(style);
    }
    style.href = `/inventory/runtime.css?v=${runtimeVersion}`;
    const script = document.createElement('script');
    script.src = `/inventory/runtime.js?v=${runtimeVersion}`; script.async = true; document.body.appendChild(script);
    return () => {
      const root = document.querySelector<HTMLElement>('.skc-inventory-app-root') as (HTMLElement & { __skcReactRoot?: { unmount: () => void } }) | null;
      script.remove(); delete window.SKCInventoryApp; delete window.wp;
      window.setTimeout(() => { if (!window.SKCInventoryApp) root?.__skcReactRoot?.unmount(); }, 0);
    };
  }, [branding]);

  return <div className="inventory-runtime-shell"><div className="skc-inventory-app-root" data-mode={new URLSearchParams(location.search).get('mode') || 'add'}><div className="center-state"><span className="spinner" />Preparando inventario…</div></div></div>;
}
