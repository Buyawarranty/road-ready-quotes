const DEALER_CANCELLATION_REVIEW_ROLES = new Set(['admin', 'super_admin', 'accounts', 'accounts_manager']);

export function canProcessDealerCancellations(role?: string | null): boolean {
  return DEALER_CANCELLATION_REVIEW_ROLES.has(String(role || '').toLowerCase());
}
