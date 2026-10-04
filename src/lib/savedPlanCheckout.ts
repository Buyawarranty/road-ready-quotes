import { calculateFullWarranty, warrantyClaims, warrantyExcess, warrantyLabour, warrantyParts, warrantyPriceWithVat, warrantyTerms } from './fullWarrantyConfiguration';

export interface SavedPlanLike {
  name: string;
  term_months: number;
  excess: number;
  labour: number;
  parts: string;
  claim_limit: number;
  plan_type: string;
  price: number | null;
}

export const MANAGE_MY_CLAIMS_MONTHLY_FEE = 1;

const gbp = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Re-prices a saved plan with today's approved rates and returns the breakdown plus the checkout plan. */
export function buildSavedPlanQuote(t: SavedPlanLike) {
  const isClaims = t.plan_type === 'basic' || t.plan_type === 'dealer-paid';
  const term = warrantyTerms.find(o => o.months === t.term_months);
  const parts = t.parts === 'none' ? 'none' : 'age-mileage';
  const partsLabel = warrantyParts.find(o => o.value === parts)!.label;
  if (!term) throw new Error('This saved plan uses a term that is no longer available.');
  const rows = [
    { label: 'Cover', value: isClaims ? 'Manage My Claims' : 'Comprehensive Warranty' },
    { label: 'Warranty term', value: term.label },
    { label: 'Customer excess', value: gbp(Number(t.excess)) },
    { label: 'Maximum labour rate', value: `${gbp(Number(t.labour))}/hr` },
    { label: 'Parts & labour', value: partsLabel },
    { label: 'Claim limit per repair', value: gbp(Number(t.claim_limit)) },
  ];

  if (isClaims) {
    const totals = warrantyPriceWithVat(MANAGE_MY_CLAIMS_MONTHLY_FEE);
    return {
      isClaims, rows, totals, customerTotals: null, monthly: true,
      plan: {
        plan_type: 'basic' as const, duration_months: term.months, term_months: term.months,
        retail_price: MANAGE_MY_CLAIMS_MONTHLY_FEE, dealer_price: MANAGE_MY_CLAIMS_MONTHLY_FEE,
        selected_options: { warranty_type: 'dealer-paid', label: 'Manage My Claims', term: term.label, excess: Number(t.excess), labour: Number(t.labour), parts: partsLabel, claim: Number(t.claim_limit), add_ons: [], saved_plan: t.name },
      },
    };
  }

  const ok = warrantyExcess.some(o => o.value === String(t.excess)) && warrantyLabour.some(o => o.value === String(t.labour)) && warrantyClaims.some(o => o.value === String(t.claim_limit));
  if (!ok) throw new Error('This saved plan uses options that are not currently available.');
  const pricing = calculateFullWarranty(String(t.excess), String(t.labour), parts, String(t.claim_limit), []);
  const totals = warrantyPriceWithVat(pricing.wholesale);
  const customerNet = t.price && t.price > 0 ? t.price : pricing.recommended;
  const customerTotals = warrantyPriceWithVat(customerNet);
  return {
    isClaims, rows, totals, customerTotals, monthly: false,
    plan: {
      plan_type: 'gold' as const, duration_months: term.months, term_months: term.months,
      retail_price: customerTotals.total, dealer_price: totals.total,
      selected_options: { warranty_type: 'fully-covered', label: 'Full Warranty Cover', term: term.label, excess: Number(t.excess), labour: Number(t.labour), parts: partsLabel, parts_key: parts, claim: Number(t.claim_limit), add_ons: [], price_basis: 'full-warranty', ex_vat_total: pricing.total, vat_total: totals.vat, customer_price: customerNet, customer_price_mode: t.price ? 'custom' : 'recommended', saved_plan: t.name },
    },
  };
}
