import type { CustomerQuoteViewProps } from '@/components/dealer/journey/CustomerQuoteView';

export interface AdjustableQuote {
  groups: { label: string; options: { label: string; value: string }[] }[];
  selected: string[];
  prices: number[];
  extras: { key: string; label: string; price: number }[];
  selectedExtras: string[];
  baseIncluded: string[];
}
export type CustomerQuotePayload = Omit<CustomerQuoteViewProps, 'open' | 'onClose'> & { adjustable?: AdjustableQuote };

/** An explicit allowlist at every level; the URL is readable, not encrypted. */
export function customerSafeQuote(p: CustomerQuotePayload): CustomerQuotePayload {
  return {
    vehicle: p.vehicle ? {
      reg: p.vehicle.reg, make: p.vehicle.make, model: p.vehicle.model,
      year: p.vehicle.year, mileage: p.vehicle.mileage,
    } : null,
    coverTitle: p.coverTitle, coverSubtitle: p.coverSubtitle,
    price: p.price, priceSuffix: p.priceSuffix,
    secondaryLabel: p.secondaryLabel, secondaryValue: p.secondaryValue,
    specs: p.specs.map(({ label, value }) => ({ label, value })),
    included: p.included?.map(String), dealerName: p.dealerName,
    adjustable: p.adjustable ? {
      groups: p.adjustable.groups.map(({ label, options }) => ({ label, options: options.map(({ label, value }) => ({ label, value })) })),
      selected: p.adjustable.selected.map(String), prices: p.adjustable.prices.map(Number),
      extras: p.adjustable.extras.map(({ key, label, price }) => ({ key, label, price })),
      selectedExtras: p.adjustable.selectedExtras.map(String), baseIncluded: p.adjustable.baseIncluded.map(String),
    } : undefined,
  };
}

export function buildCustomerQuoteUrl(p: CustomerQuotePayload) {
  const bytes = new TextEncoder().encode(JSON.stringify(customerSafeQuote(p)));
  const encoded = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
  return `/customer-quote/#${encoded}`;
}

export function decodeCustomerQuote(hash: string): CustomerQuotePayload | null {
  try {
    const raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(hash.replace(/^#/, '')), c => c.charCodeAt(0))));
    if (!raw || typeof raw.coverTitle !== 'string' || !Number.isFinite(raw.price) || raw.price < 0 || !Array.isArray(raw.specs)) return null;
    if (raw.adjustable) {
      const a = raw.adjustable;
      if (!Array.isArray(a.groups) || a.groups.length !== 4 || a.groups.some((g: any) => typeof g.label !== 'string' || !Array.isArray(g.options) || !g.options.length || g.options.length > 10 || g.options.some((o: any) => typeof o.label !== 'string' || typeof o.value !== 'string')) ||
        !Array.isArray(a.selected) || a.selected.length !== 4 || a.selected.some((v: string, i: number) => !a.groups[i].options.some((o: any) => o.value === v)) ||
        !Array.isArray(a.prices) || a.prices.length !== a.groups.reduce((n: number, g: any) => n * g.options.length, 1) || a.prices.some((n: number) => !Number.isFinite(n) || n <= 0) ||
        !Array.isArray(a.extras) || a.extras.some((e: any) => typeof e.key !== 'string' || typeof e.label !== 'string' || !Number.isFinite(e.price) || e.price < 0) ||
        !Array.isArray(a.selectedExtras) || !Array.isArray(a.baseIncluded)) return null;
    }
    return customerSafeQuote(raw);
  } catch { return null; }
}

export function customerQuoteMessage(p: CustomerQuotePayload, url: string) {
  const safe = customerSafeQuote(p);
  return [safe.dealerName, safe.coverTitle, [safe.vehicle?.reg, safe.vehicle?.make, safe.vehicle?.model].filter(Boolean).join(' '),
    ...safe.specs.map(s => `${s.label}: ${s.value}`),
    `Customer price: £${safe.price.toFixed(2)} ${safe.priceSuffix || ''} including VAT`,
    ...(safe.included || []), 'Quote only — subject to eligibility and policy terms.', url].filter(Boolean).join('\n');
}
export function adjustableQuotePrice(a: AdjustableQuote, selected: string[], extras: string[]) {
  let index = 0;
  for (let i = 0; i < a.groups.length; i++) {
    const position = a.groups[i].options.findIndex(o => o.value === selected[i]);
    if (position < 0) return NaN;
    index = index * a.groups[i].options.length + position;
  }
  return Math.round((a.prices[index] + a.extras.filter(e => extras.includes(e.key)).reduce((sum, e) => sum + e.price, 0)) * 100) / 100;
}
