export const EDITABLE_DEALER_QUOTE_STATUSES = ['draft', 'pending', 'quoted', 'awaiting_panda'];

export function isEditableDealerQuote(status: string | null | undefined, paidAt?: string | null): boolean {
  return !paidAt && EDITABLE_DEALER_QUOTE_STATUSES.includes(String(status || '').toLowerCase());
}

/** Quote lists and resume controls use payment evidence, not the last saved journey step. */
export function dealerQuoteProgress(quote: { status?: string | null; paid_at?: string | null; vehicle_reg?: string | null }) {
  const status = String(quote.status || '').toLowerCase();
  const canResume = isEditableDealerQuote(status, quote.paid_at);
  const settledLabel = status === 'cancelled' ? 'Cancelled'
    : status === 'refunded' ? 'Refunded'
    : status === 'closed' ? 'Closed'
    : status === 'invoiced' ? 'Completed · invoice issued'
    : quote.paid_at || ['paid', 'converted', 'completed', 'sent'].includes(status) ? 'Completed'
    : null;
  const search = quote.vehicle_reg ? `?search=${encodeURIComponent(quote.vehicle_reg.replace(/\s+/g, '').toUpperCase())}` : '';
  return { canResume, settledLabel, warrantyHref: `/dealer-portal/warranties${search}` };
}

export function dealerQuoteCheckoutError(quote: { status?: string | null; paid_at?: string | null } | null): string | null {
  if (!quote) return 'This quote could not be found. Please check your saved quotes.';
  return isEditableDealerQuote(quote.status, quote.paid_at)
    ? null
    : 'This quote has already been processed. Open the existing warranty, or start a new quote for another sale.';
}