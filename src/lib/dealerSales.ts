export interface DealerSaleAmountRow {
  final_amount: number | string | null;
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
