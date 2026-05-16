// Default trader pricing multipliers — fallback if DB read fails.
// Sourced from supplied base_pricing.xlsx. Single Gold plan only.

export type TraderTerm = 3 | 6 | 12 | 24 | 36;
export type TraderExcess = 0 | 50 | 100 | 250 | 500;
export type TraderLabour = 40 | 70 | 100 | 150 | 200;
export type TraderParts = 'age_mileage' | 'none';
export type TraderClaim = 750 | 1000 | 2000 | 3000;

export interface TraderConfig {
  base: number;
  excess: Record<number, number>;
  labour: Record<number, number>;
  parts: Record<TraderParts, number>;
  claim: Record<number, number>;
  term: Record<number, number>;
  dealer_pct: number;
  vat: number;
}

export const DEFAULT_TRADER_CONFIG: TraderConfig = {
  base: 147.5,
  excess: { 0: 1.10, 50: 1.00, 100: 0.87, 250: 0.78, 500: 0.70 },
  labour: { 40: 0.90, 70: 1.00, 100: 1.10, 150: 1.30, 200: 1.50 },
  parts: { age_mileage: 1.00, none: 1.20 },
  claim: { 750: 0.85, 1000: 1.00, 2000: 1.30, 3000: 1.55 },
  term: { 3: 0.6, 6: 0.8, 12: 1.0, 24: 1.8, 36: 2.6 },
  dealer_pct: 0.80,
  vat: 1.20,
};

export const EXCESS_OPTIONS: TraderExcess[] = [0, 50, 100, 250, 500];
export const LABOUR_OPTIONS: TraderLabour[] = [40, 70, 100, 150, 200];
export const PARTS_OPTIONS: { key: TraderParts; label: string }[] = [
  { key: 'age_mileage', label: 'Age & Mileage' },
  { key: 'none', label: 'No contribution' },
];
export const CLAIM_OPTIONS: TraderClaim[] = [750, 1000, 2000, 3000];
export const TERM_OPTIONS: TraderTerm[] = [3, 6, 12, 24, 36];

export const formatClaim = (n: number) =>
  n >= 1000 ? `£${(n / 1000).toLocaleString('en-GB', { maximumFractionDigits: 2 })}k` : `£${n}`;
