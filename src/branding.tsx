import { createContext, useContext, type ReactNode } from 'react';

export interface BrandingConfig {
  organizationName: string;
  productName: string;
  logoUrl: string;
  faviconUrl: string;
  colors: {
    primary: string;
    accent: string;
    highlight: string;
    ink: string;
    muted: string;
    surface: string;
  };
}

export const defaultBranding: BrandingConfig = {
  organizationName: 'Su Casa Inmobiliaria',
  productName: 'SKC Operaciones',
  logoUrl: 'https://sucasainmobiliaria.com.co/wp-content/uploads/2022/05/logo-white-skc-e1781617234571.png',
  faviconUrl: 'https://sucasainmobiliaria.com.co/wp-content/uploads/2026/06/cropped-ISOLOGO-WEB.png',
  colors: {
    primary: '#1B447D',
    accent: '#F59120',
    highlight: '#F8CF4A',
    ink: '#404041',
    muted: '#635F5A',
    surface: '#FFFFFF',
  },
};

const BrandingContext = createContext(defaultBranding);

export function BrandingProvider({ value, children }: { value: BrandingConfig; children: ReactNode }) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}

export function applyBranding(branding: BrandingConfig) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', branding.colors.primary);
  root.style.setProperty('--brand-accent', branding.colors.accent);
  root.style.setProperty('--brand-highlight', branding.colors.highlight);
  root.style.setProperty('--brand-ink', branding.colors.ink);
  root.style.setProperty('--brand-muted', branding.colors.muted);
  root.style.setProperty('--brand-surface', branding.colors.surface);
  document.title = `${branding.productName} · Formularios`;

  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = branding.faviconUrl;
}
