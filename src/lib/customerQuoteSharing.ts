import type { CustomerQuoteViewProps } from '@/components/dealer/journey/CustomerQuoteView';

export type CustomerQuotePayload = Omit<CustomerQuoteViewProps, 'open' | 'onClose'>;

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
    return customerSafeQuote(raw);
  } catch { return null; }
}

export function customerQuoteMessage(p: CustomerQuotePayload, url: string) {
  const safe = customerSafeQuote(p);
  return [safe.dealerName, safe.coverTitle, [safe.vehicle?.reg, safe.vehicle?.make, safe.vehicle?.model].filter(Boolean).join(' '),
    ...safe.specs.map(s => `${s.label}: ${s.value}`),
    `Customer price: £${safe.price.toFixed(2)} ${safe.priceSuffix || '/month'} including VAT`,
    ...(safe.included || []), 'Quote only — subject to eligibility and policy terms.', url].filter(Boolean).join('\n');
}