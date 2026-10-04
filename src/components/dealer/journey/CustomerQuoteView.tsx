import React, { useEffect } from 'react';
import { X, Check, ShieldCheck, Printer, Lock, CreditCard } from 'lucide-react';
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
  paymentSection?: React.ReactNode;
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
  paymentSection,
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
    <div className="customer-quote-view dealer-crm fixed inset-0 z-[100] overflow-y-auto bg-crm-blue-soft text-foreground">
      <header className="border-b border-crm-line bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <img src={logoAssetUrl} alt="Panda Protect" className="h-12 w-auto" />
          <div className="customer-quote-tools flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> Print</Button>
            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Close" onClick={onClose}><X /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-1 text-2xl font-bold text-foreground">Customer Quote</h1>
        <p className="mb-6 text-sm text-muted-foreground">{coverTitle}{coverSubtitle ? ` · ${coverSubtitle}` : ''}</p>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-w-0 space-y-5">
            {vehicle?.reg && <section className="rounded-lg border border-crm-line bg-card p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-44 shrink-0"><div className="vehicle-reg-plate vehicle-reg-plate--quote"><span className="vehicle-reg-plate__country">GB<span>UK</span></span><span className="vehicle-reg-plate__text">{vehicle.reg}</span></div></div>
                <div className="min-w-0"><h2 className="text-base font-bold uppercase">{vehicle.make} {vehicle.model}</h2><p className="mt-1 text-sm text-muted-foreground">{[vehicle.year, vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString('en-GB')} miles` : ''].filter(Boolean).join(' · ')}</p></div>
              </div>
            </section>}
            {quoteControls && <section className="rounded-lg border border-crm-line bg-card p-5">{quoteControls}</section>}
            <section className="rounded-lg border border-crm-line bg-card p-5 sm:p-6">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><ShieldCheck className="h-5 w-5 text-crm-orange" />Your warranty cover</h2>
              <dl>{specs.map(s => <div key={s.label} className="flex items-start justify-between gap-4 border-b border-crm-line py-3 text-sm"><dt className="text-muted-foreground">{s.label}</dt><dd className="max-w-[55%] text-right font-semibold">{s.value}</dd></div>)}</dl>
              {included.length > 0 && <><h3 className="mb-3 mt-6 text-sm font-bold">What's included</h3><ul className="space-y-3">{included.map(i => <li key={i} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-crm-green" />{i}</li>)}</ul></>}
            </section>
            <section className="rounded-lg border border-crm-line bg-card p-5 sm:p-6">
              <h2 className="mb-4 text-base font-bold">Full price breakdown</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Warranty cover excluding VAT</dt><dd className="font-semibold">{fmt(price / 1.2)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">VAT (20%)</dt><dd className="font-semibold">{fmt(price - price / 1.2)}</dd></div>
                <div className="flex justify-between gap-3 border-t border-crm-line pt-4 font-bold"><dt>Total to pay</dt><dd>{fmt(price)}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">Full warranty price · One payment · Includes VAT</p>
            </section>
            {paymentSection && <section className="customer-quote-tools rounded-lg border border-crm-line bg-card p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><CreditCard className="h-5 w-5 text-crm-orange" />Payment</h2>
              {paymentSection}
            </section>}
          </div>
          <aside className="rounded-lg border border-crm-line bg-card p-5 lg:sticky lg:top-6">
            <h2 className="border-b border-crm-line pb-3 text-base font-bold">Your cover summary</h2>
            <p className="mt-4 text-sm font-bold">{coverTitle}</p>
            <dl className="mt-3 space-y-3 text-xs">{specs.map(s => <div key={s.label} className="flex justify-between gap-3"><dt className="text-muted-foreground">{s.label}</dt><dd className="max-w-[55%] text-right font-semibold">{s.value}</dd></div>)}</dl>
            <div className="mt-5 border-t border-crm-line pt-4"><p className="text-xs text-muted-foreground">Full warranty price</p><p className="mt-1 text-3xl font-bold text-crm-green">{fmt(price)}{priceSuffix}</p><p className="mt-1 text-xs text-muted-foreground">Including {fmt(price - price / 1.2)} VAT</p></div>
            {secondaryLabel && secondaryValue && <p className="mt-3 text-sm">{secondaryLabel} <strong>{secondaryValue}</strong></p>}
            <img src={pandaAssetUrl} alt="Panda Protect warranty protection" className="mx-auto mt-5 h-36 w-auto object-contain" />
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Secure checkout</p>
          </aside>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Quote only — not an issued warranty. Subject to vehicle eligibility and the Panda Protect terms and conditions.</p>
      </main>
    </div>
  );
};

export default CustomerQuoteView;
