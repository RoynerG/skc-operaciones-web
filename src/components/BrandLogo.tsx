import { useState } from 'react';
import { useBranding } from '../branding';

export default function BrandLogo({ className = '' }: { className?: string }) {
  const branding = useBranding();
  const [failed, setFailed] = useState(false);
  return (
    <span className={`brand-logo ${className}`.trim()}>
      {!failed && branding.logoUrl ? (
        <img src={branding.logoUrl} alt={branding.organizationName} onError={() => setFailed(true)} />
      ) : (
        <strong>SKC</strong>
      )}
    </span>
  );
}
