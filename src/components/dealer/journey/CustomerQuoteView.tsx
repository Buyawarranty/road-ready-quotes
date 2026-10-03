import React, { useEffect } from 'react';
import { X, Check, ShieldCheck, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  priceSuffix = '/month',
  secondaryLabel,
  secondaryValue,
  specs,
  included = [],
  dealerName,
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

      <div className="max-w-2xl mx-auto px-5 pb-10 pt-20 sm:py-14">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 text-crm-orange font-extrabold ">
            <ShieldCheck className="w-5 h-5" /> Panda Protect
          </div>
          {dealerName && (
            <p className="text-xs text-muted-foreground mt-1">Presented by {dealerName}</p>
          )}
        </div>

        <div className="bg-card border border-crm-line rounded-lg overflow-hidden">
          {/* Vehicle */}
          {vehicle?.reg && (
            <div className="px-6 sm:px-8 py-5 border-b border-crm-line flex flex-wrap items-center gap-4">
              <div className="w-36 shrink-0">
                <div className="vehicle-reg-plate vehicle-reg-plate--list">
                  <span className="vehicle-reg-plate__country">GB<span>UK</span></span>
                  <span className="vehicle-reg-plate__text">{vehicle.reg}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-foreground uppercase break-words">
                  {vehicle.make} {vehicle.model}
                </p>
                <p className="text-xs text-muted-foreground">
                  {vehicle.year || '—'}
                  {vehicle.mileage ? ` · ${Number(vehicle.mileage).toLocaleString('en-GB')} miles` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="px-6 sm:px-8 py-8 text-center bg-crm-navy">
            <h1 className="text-primary-foreground text-lg font-bold">Your warranty quote</h1><p className="mt-1 text-primary-foreground text-sm font-semibold">{coverTitle}</p>
            {coverSubtitle && <p className="text-primary-foreground text-xs mt-1">{coverSubtitle}</p>}
            <div className="mt-4 flex flex-wrap items-end justify-center gap-1">
              <span className="text-3xl sm:text-5xl font-bold text-primary-foreground">{fmt(price)}</span>
              <span className="text-primary-foreground font-semibold pb-2">{priceSuffix}</span>
            </div>
            {secondaryLabel && secondaryValue && (
              <p className="text-primary-foreground text-sm mt-3">
                {secondaryLabel} <span className="font-bold text-primary-foreground">{secondaryValue}</span>
              </p>
            )}
            <p className="text-[11px] text-primary-foreground mt-2">Final monthly price · Includes VAT</p>
          </div>

          {/* Cover spec */}
          <div className="px-6 sm:px-8 py-6">
            {quoteControls}
            <p className="text-[11px] uppercase  text-muted-foreground font-bold mb-3">Your cover</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {specs.map((s) => (
                <div key={s.label} className="flex items-start justify-between gap-3 border-b border-dashed border-crm-line pb-2">
                  <dt className="text-sm text-muted-foreground">{s.label}</dt>
                  <dd className="max-w-[55%] text-right text-sm font-bold text-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 border-t border-crm-line pt-4">
              <h2 className="mb-2 text-sm font-bold">Price breakdown</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cover excluding VAT</dt><dd>{fmt(price / 1.2)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">VAT (20%)</dt><dd>{fmt(price - price / 1.2)}</dd></div>
                <div className="flex justify-between gap-3 border-t border-crm-line pt-2 font-bold"><dt>Final monthly price</dt><dd>{fmt(price)}</dd></div>
              </dl>
            </div>
            {included.length > 0 && (
              <div className="mt-6">
                <p className="text-[11px] uppercase  text-muted-foreground font-bold mb-3">Included</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
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
