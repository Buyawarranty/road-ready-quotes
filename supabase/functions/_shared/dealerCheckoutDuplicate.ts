export const normalizeCheckoutPlate = (plate: string) => plate.replace(/ /g, '').toUpperCase();
export const normalizeCheckoutEmail = (email: string) => email.trim().toLowerCase();

export function dealerCheckoutReuseError(row: { dealer_id: string | null; brand: string | null; purchase_source: string | null; payment_verified: boolean | null; payment_status: string | null }, dealerId: string): string | null {
  if (row.dealer_id !== dealerId || row.brand !== 'pandaprotect' || row.purchase_source !== 'dealer') return 'A warranty record already exists for this customer and vehicle. Please contact Panda Protect to review it.';
  if (row.payment_verified || ['paid', 'invoice_pending', 'intro_pending'].includes(row.payment_status || '')) return 'This customer and vehicle already have an issued warranty. Open the existing warranty instead.';
  return null;
}

/** State of an earlier card checkout for the same customer and vehicle. */
export type DealerEarlierCardSession = 'none' | 'open' | 'expired' | 'complete' | 'unknown';

/**
 * A free warranty replaces the dealer's own earlier unpaid attempt instead of being blocked by it,
 * but never one that was paid, belongs elsewhere, or whose card payment cannot be ruled out.
 */
export function dealerFreeCheckoutReuseError(row: Parameters<typeof dealerCheckoutReuseError>[0], dealerId: string, session: DealerEarlierCardSession): string | null {
  const reuseError = dealerCheckoutReuseError(row, dealerId);
  if (reuseError) return reuseError;
  if (session === 'complete') return 'Payment already completed. Open the existing warranty.';
  if (session === 'unknown') return 'An earlier card checkout for this customer could not be checked. No warranty was issued and no free entitlement used. Try again shortly or contact dealer support.';
  return null;
}
