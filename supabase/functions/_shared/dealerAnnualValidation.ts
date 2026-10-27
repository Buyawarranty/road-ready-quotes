export function validateAnnualPlan(plan: { duration_months: number; dealer_price: number; retail_price: number; excess?: number; labour_rate?: number; claim_limit?: number }, product: { months: number; dealer_price: number; min_price: number; max_price?: number | null; active: boolean; approvals_complete?: boolean } | undefined) {
  if (!product || !product.active || (product.months === 48 && product.approvals_complete !== true)) return 'This warranty duration is awaiting approval.';
  if (Math.round(plan.dealer_price * 100) !== Math.round(product.dealer_price * 100)) return 'The warranty cost has changed. Please refresh your quote.';
  if (!Number.isFinite(plan.retail_price) || plan.retail_price < product.min_price || (product.max_price != null && plan.retail_price > product.max_price)) return 'Customer selling price is outside the approved range.';
  if (plan.excess !== 0 || plan.labour_rate !== 100 || plan.claim_limit !== 2000) return 'This warranty requires the approved fixed cover.';
  return null;
}