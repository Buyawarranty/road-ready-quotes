import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function formatDealerRegistration(value?: string | null): string {
  const raw = String(value || '').trim().toUpperCase();
  const compact = raw.replace(/\s+/g, '');
  return /^[A-Z0-9]{7}$/.test(compact) ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : raw;
}

const DealerRegistrationPlate: React.FC<{
  registration?: string | null;
  slim?: boolean;
  className?: string;
}> = ({ registration, slim = false, className }) => {
  const formatted = formatDealerRegistration(registration);
  return (
    <div
      className={cn('vehicle-reg-plate vehicle-reg-plate--list relative', slim && 'vehicle-reg-plate--slim', className)}
      aria-label={formatted ? `Registration ${formatted}` : 'Registration not supplied'}
    >
      <span className="vehicle-reg-plate__country" aria-hidden="true"><span>GB</span><span>UK</span></span>
      <span className="vehicle-reg-plate__text">{formatted || '—'}</span>
      {formatted && (
        <span className="vehicle-reg-plate__check" aria-hidden="true">
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </span>
      )}
    </div>
  );
};

export default DealerRegistrationPlate;
