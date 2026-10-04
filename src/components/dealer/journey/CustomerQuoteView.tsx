import React, { useEffect } from 'react';
import { X, Check, ShieldCheck, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoAssetUrl from '@/assets/panda-protect-v2.webp';
import pandaAssetUrl from '@/assets/customer-quote-panda.webp';

export interface CustomerQuoteViewProps {
  open: boolean;
  onClose: () => void;
  vehicle?: { reg?: string; make?: string; model?: string; year?: string; mileage?: string } | null;
  coverTitle: string;
  coverSubtitle?: string;
  /** Headline price the customer sees (gross, inc VAT). */
  price: number;
  priceSuffix?: string;
  /** Optional secondary line, e.g. total over term. */
  secondaryLabel?: string;
  secondaryValue?: string;
  /** Cover spec rows shown to the customer. */
  specs: { label: string; value: string }[];
  /** Included / add-on bullet list. */
  included?: string[];
  dealerName?: string;
  quoteControls?: React.ReactNode;
}

const fmt = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Full-screen customer presentation mode.
 * Deliberately shows a single price and no trade/wholesale/margin wording.
 * Exit is a small unlabelled control so the customer is never prompted that
 * another price view exists.
 */
const CustomerQuoteView: React.FC<CustomerQuoteViewProps> = ({
  open,
  onClose,
  vehicle,
  coverTitle,
  coverSubtitle,
  price,
  priceSuffix = '',
  secondaryLabel,
  secondaryValue,
  specs,
  included = [],
  quoteControls,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="customer-quote-view dealer-crm fixed inset-0 z-[100] overflow-y-auto bg-background text-foreground">
      <div className="customer-quote-tools absolute right-4 top-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> Print</Button>
        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Close" onClick={onClose}><X /></Button>
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-10 pt-16 sm:pt-20">
        <div className="text-center mb-6">
          <img src={logoAssetUrl} alt="Panda Protect" className="mx-auto h-10 w-auto" />
        </div>

        <div className="bg-card border border-crm-line rounded-xl overflow-hidden shadow-sm">
          {/* Vehicle */}
          {vehicle?.reg && (
            <div className="px-6 sm:px-8 py-6 flex flex-wrap items-center gap-5">
              <div className="w-44 shrink-0">
                <div className="vehicle-reg-plate vehicle-reg-plate--quote">
                  <span className="vehicle-reg-plate__country">GB<span>UK</span></span>
                  <span className="vehicle-reg-plate__text">{vehicle.reg}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-extrabold text-foreground uppercase break-words">
                  {vehicle.make} {vehicle.model}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[vehicle.year || '—', vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString('en-GB')} miles` : ''].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          )}

          {/* Navy hero */}
          <div className="relative overflow-hidden bg-crm-navy px-6 sm:px-8 py-10">
            <div className="relative z-10 max-w-[64%]">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary-foreground/85">Your warranty quote</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight text-primary-foreground">{coverTitle}</h1>
              {coverSubtitle && <p className="mt-2 text-sm text-primary-foreground/90">{coverSubtitle}</p>}
              <div className="mt-6 flex flex-wrap items-end justify-start gap-1">
                <span className="text-5xl sm:text-6xl font-bold text-primary-foreground">{fmt(price)}</span>
                <span className="text-primary-foreground font-semibold pb-2">{priceSuffix}</span>
              </div>
              <p className="mt-2 text-sm text-primary-foreground/90">Full warranty price · Includes VAT</p>
              {secondaryLabel && secondaryValue && (
                <p className="text-primary-foreground text-sm mt-3">
                  {secondaryLabel} <span className="font-bold text-primary-foreground">{secondaryValue}</span>
                </p>
              )}
            </div>
            <p className="quote-script pointer-events-none absolute right-4 top-6 sm:right-8 sm:top-8 z-10 -rotate-3 text-lg sm:text-2xl text-primary-foreground underline decoration-crm-orange decoration-2 underline-offset-4">
              Drive with confidence
            </p>
            <img
              src={pandaAssetUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-0 sm:right-4 h-40 sm:h-52 w-auto object-contain object-bottom"
            />
          </div>

          {/* Body */}
          <div className="px-6 sm:px-8 py-7">
            {quoteControls}
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-1">Your cover</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              {specs.map((s) => (
                <div key={s.label} className="flex items-start justify-between gap-3 border-b border-crm-line/60 py-2.5">
                  <dt className="text-sm text-muted-foreground">{s.label}</dt>
                  <dd className="max-w-[55%] text-right text-sm font-bold text-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-7 border-t border-crm-line pt-5">
              <h2 className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-3">Price breakdown</h2>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cover excluding VAT</dt><dd className="font-semibold">{fmt(price / 1.2)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">VAT (20%)</dt><dd className="font-semibold">{fmt(price - price / 1.2)}</dd></div>
                <div className="flex justify-between gap-3 rounded-md bg-muted px-3 py-2.5 font-bold"><dt>Final price (includes VAT)</dt><dd>{fmt(price)}</dd></div>
              </dl>
            </div>
            {included.length > 0 && (
              <div className="mt-7">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-3">Included</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-8">
                  {included.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-crm-green mt-0.5 shrink-0" /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Quote only — not an issued warranty. Subject to vehicle eligibility and the Panda Protect terms and conditions.
        </p>
      </div>
    </div>
  );
};

export default CustomerQuoteView;
