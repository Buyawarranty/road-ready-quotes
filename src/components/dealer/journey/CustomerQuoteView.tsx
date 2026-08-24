import React, { useEffect } from 'react';
import { X, Check, ShieldCheck } from 'lucide-react';

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
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-slate-50 to-white overflow-y-auto">
      {/* discreet, unlabelled exit */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/70 border border-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="max-w-2xl mx-auto px-5 py-10 sm:py-14">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 text-orange-600 font-extrabold tracking-tight">
            <ShieldCheck className="w-5 h-5" /> Panda Protect
          </div>
          {dealerName && (
            <p className="text-xs text-gray-500 mt-1">Presented by {dealerName}</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
          {/* Vehicle */}
          {vehicle?.reg && (
            <div className="px-6 sm:px-8 py-5 border-b border-gray-100 flex items-center gap-4">
              <div className="inline-flex items-stretch rounded-sm overflow-hidden border-2 border-black shrink-0">
                <div className="bg-blue-700 text-yellow-300 text-[10px] font-bold flex items-center px-1.5">GB</div>
                <div className="bg-yellow-300 text-gray-900 font-black tracking-widest text-base px-2.5 py-1">
                  {vehicle.reg}
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-gray-900 uppercase truncate">
                  {vehicle.make} {vehicle.model}
                </p>
                <p className="text-xs text-gray-500">
                  {vehicle.year || '—'}
                  {vehicle.mileage ? ` · ${Number(vehicle.mileage).toLocaleString('en-GB')} miles` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="px-6 sm:px-8 py-8 text-center bg-slate-900">
            <p className="text-slate-300 text-sm font-semibold">{coverTitle}</p>
            {coverSubtitle && <p className="text-slate-400 text-xs mt-1">{coverSubtitle}</p>}
            <div className="mt-4 flex items-end justify-center gap-1">
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">{fmt(price)}</span>
              <span className="text-slate-300 font-semibold pb-2">{priceSuffix}</span>
            </div>
            {secondaryLabel && secondaryValue && (
              <p className="text-slate-300 text-sm mt-3">
                {secondaryLabel} <span className="font-bold text-white">{secondaryValue}</span>
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-2">Includes VAT</p>
          </div>

          {/* Cover spec */}
          <div className="px-6 sm:px-8 py-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-3">Your cover</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {specs.map((s) => (
                <div key={s.label} className="flex items-center justify-between border-b border-dashed border-gray-200 pb-2">
                  <dt className="text-sm text-gray-500">{s.label}</dt>
                  <dd className="text-sm font-bold text-gray-900">{s.value}</dd>
                </div>
              ))}
            </dl>

            {included.length > 0 && (
              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-3">Included</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                  {included.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Quotation subject to vehicle eligibility and the Panda Protect terms and conditions.
        </p>
      </div>
    </div>
  );
};

export default CustomerQuoteView;
