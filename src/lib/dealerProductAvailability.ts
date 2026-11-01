// Which dealer products can be quoted right now.
//
// Manage My Claim is paused: every quote goes straight to Comprehensive Warranty.
// The claim-handling journey, its pricing rules and its pages are deliberately left
// in place so the product can be switched back on from one flag (planned to move to
// an admin activate/deactivate control).
export const MANAGE_MY_CLAIM_ENABLED = false;

export const COMPREHENSIVE_QUOTE_URL = '/dealer-portal/quote/pricing';
export const MANAGE_MY_CLAIM_QUOTE_URL = '/dealer-portal/quote/claim-handling';

/** Where a quote continues once vehicle details are in. */
export function quoteUrlForPlan(planKey: string | null | undefined): string {
  if (planKey === 'dealer-paid' && MANAGE_MY_CLAIM_ENABLED) return MANAGE_MY_CLAIM_QUOTE_URL;
  return COMPREHENSIVE_QUOTE_URL;
}

/** Saved plans a dealer can still quote today: Manage My Claim plans stay hidden while paused. */
export function isPlanQuotable(planType?: string | null): boolean {
  if (!MANAGE_MY_CLAIM_ENABLED && (planType === 'basic' || planType === 'dealer-paid')) return false;
  return true;
}
