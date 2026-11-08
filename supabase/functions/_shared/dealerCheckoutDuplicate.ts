export const normalizeCheckoutPlate = (plate: string) => plate.replace(/ /g, '').toUpperCase();
export const normalizeCheckoutEmail = (email: string) => email.trim().toLowerCase();

export function dealerCheckoutReuseError(row: { dealer_id: string | null; brand: string | null; purchase_source: string | null; payment_verified: boolean | null; payment_status: string | null }, dealerId: string): string | null {
  if (row.dealer_id !== dealerId || row.brand !== 'pandaprotect' || row.purchase_source !== 'dealer') return 'A warranty record already exists for this customer and vehicle. Please contact Panda Protect to review it.';
  if (row.payment_verified || ['paid', 'invoice_pending'].includes(row.payment_status || '')) return 'This customer and vehicle already have an issued warranty. Open the existing warranty instead.';
  return null;
}