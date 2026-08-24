import { TraderClaim, TraderExcess, TraderLabour, TraderParts, TraderTerm } from './traderPricingDefaults';

export interface DealerWarrantyDefaults {
  term: TraderTerm;
  excess: TraderExcess;
  labour: TraderLabour;
  parts: TraderParts;
  claim: TraderClaim;
}

const KEY = 'dealerWarrantyDefaults';

export const FACTORY_DEFAULTS: DealerWarrantyDefaults = {
  term: 12,
  excess: 50,
  labour: 70,
  parts: 'age_mileage',
  claim: 1000,
};

export function loadDealerDefaults(): DealerWarrantyDefaults | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return { ...FACTORY_DEFAULTS, ...parsed } as DealerWarrantyDefaults;
  } catch {
    return null;
  }
}

export function saveDealerDefaults(d: DealerWarrantyDefaults) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function clearDealerDefaults() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function describeDefaults(d: DealerWarrantyDefaults) {
  const claim = d.claim >= 1000 ? `£${d.claim / 1000}k` : `£${d.claim}`;
  return `${d.term}m · £${d.excess} excess · £${d.labour}/hr · ${claim} claim limit`;
}
