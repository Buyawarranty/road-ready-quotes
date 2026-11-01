export interface AnnualBoost { active: boolean; claim_limit: number; dealer_price: number; retail_price: number; terms?: { months: number; dealer_price: number; retail_price: number }[] }

const pence = (n: number) => Math.round(n * 100);

export function validateAnnualPlan(
  plan: { duration_months: number; dealer_price: number; retail_price: number; excess?: number; labour_rate?: number; claim_limit?: number; boost?: boolean },
  product: { months: number; dealer_price: number; min_price: number; max_price?: number | null; active: boolean; approvals_complete?: boolean } | undefined,
  options: { claim?: number; boost?: AnnualBoost | null } = {},
) {
  if (!product || !product.active || (product.months === 48 && product.approvals_complete !== true)) return 'This warranty duration is awaiting approval.';
  const configuredBoost = options.boost ?? null;
  const termPrice = configuredBoost?.terms?.find(item => item.months === plan.duration_months);
  const boost = plan.boost === true ? (configuredBoost ? { ...configuredBoost, ...(termPrice || {}) } : null) : null;
  if (plan.boost === true && !boost?.active) return 'The claim limit boost is unavailable. Please refresh your quote.';
  const boostCost = boost ? boost.dealer_price : 0;
  const boostRetail = boost ? boost.retail_price : 0;
  if (pence(plan.dealer_price) !== pence(product.dealer_price + boostCost)) return 'The warranty cost has changed. Please refresh your quote.';
  if (!Number.isFinite(plan.retail_price) || pence(plan.retail_price) < pence(product.min_price + boostRetail)
    || (product.max_price != null && pence(plan.retail_price) > pence(product.max_price + boostRetail))) return 'Customer selling price is outside the approved range.';
  const claim = boost ? boost.claim_limit : options.claim ?? 2000;
  if (plan.excess !== 0 || plan.labour_rate !== 100 || plan.claim_limit !== claim) return 'This warranty requires the approved fixed cover.';
  return null;
}
