export interface DealerSaleAmountRow {
  final_amount?: number | string | null;
}

export interface DealerSaleStatusRow {
  status?: string | null;
}

export function dealerSaleAmount(sale: DealerSaleAmountRow): number {
  const amount = Number(sale.final_amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function isCountedDealerSale(sale: DealerSaleStatusRow): boolean {
  return !['cancelled', 'refunded'].includes((sale.status || '').toLowerCase());
}

export interface DealerSalePaymentRow {
  payment_status?: string | null;
  stripe_session_id?: string | null;
  final_amount?: number | string | null;
}

export function isOutstandingDealerInvoice(sale: DealerSalePaymentRow): boolean {
  return ['invoice_pending', 'overdue'].includes((sale.payment_status || '').toLowerCase());
}

export function isCompletedDealerSale(sale: DealerSalePaymentRow): boolean {
  return (sale.payment_status || '').toLowerCase() === 'paid';
}

/** Paid purchases exclude £0 cover and unwound sales; issued cover is counted separately. */
export function isPaidDealerPurchase(sale: DealerSalePaymentRow & DealerSaleStatusRow): boolean {
  return isCountedDealerSale(sale) && isCompletedDealerSale(sale) && dealerSaleAmount(sale) > 0;
}

export function dealerSalePaymentLabel(sale: DealerSalePaymentRow): string {
  if (Number(sale.final_amount ?? 0) === 0) return 'Introductory offer';
  return (sale.stripe_session_id || '').startsWith('invoice:') ? 'Invoice paid' : 'Card payment';
}
