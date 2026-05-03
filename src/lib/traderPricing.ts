import { DEFAULT_TRADER_CONFIG, TraderConfig, TraderTerm, TraderParts } from './traderPricingDefaults';

export interface TraderPricingInput {
  term: TraderTerm;
  excess: number;
  labour: number;
  parts: TraderParts;
  claim: number;
  config?: TraderConfig;
}

export interface TraderPricingResult {
  exVat: number;
  vat: number;
  gross: number;
  monthlyEquivalent: number;
  breakdown: { label: string; value: string }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcTraderPrice(input: TraderPricingInput): TraderPricingResult {
  const cfg = input.config ?? DEFAULT_TRADER_CONFIG;
  const eM = cfg.excess[input.excess] ?? 1;
  const lM = cfg.labour[input.labour] ?? 1;
  const pM = cfg.parts[input.parts] ?? 1;
  const cM = cfg.claim[input.claim] ?? 1;
  const tM = cfg.term[input.term] ?? 1;

  const exVat = round2(cfg.base * eM * lM * pM * cM * cfg.dealer_pct * tM);
  const gross = round2(exVat * cfg.vat);
  const vat = round2(gross - exVat);
  const monthlyEquivalent = round2(gross / input.term);

  return {
    exVat,
    vat,
    gross,
    monthlyEquivalent,
    breakdown: [
      { label: 'Base', value: `£${cfg.base.toFixed(2)}` },
      { label: `Excess £${input.excess}`, value: `× ${eM}` },
      { label: `Labour £${input.labour}/hr`, value: `× ${lM}` },
      { label: `Parts ${input.parts === 'none' ? 'no contribution' : 'age & mileage'}`, value: `× ${pM}` },
      { label: `Claim £${input.claim}`, value: `× ${cM}` },
      { label: `Term ${input.term}m`, value: `× ${tM}` },
      { label: `Dealer pay`, value: `× ${cfg.dealer_pct}` },
    ],
  };
}
