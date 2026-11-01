export interface AnnualWarrantyProduct {
  months: number;
  dealer_price: number;
  retail_price: number;
  min_price: number;
  max_price: number | null;
  active: boolean;
  approvals_complete?: boolean;
}

export const priceInPence = (amount: number) => Math.round(amount * 100);
export function validSellingPrice(amount: number, product: AnnualWarrantyProduct) {
  return Number.isFinite(amount) && priceInPence(amount) >= priceInPence(product.min_price)
    && (product.max_price == null || priceInPence(amount) <= priceInPence(product.max_price));
}
export function stepSellingPrice(amount: number, direction: -1 | 1, product: AnnualWarrantyProduct) {
  const next = (priceInPence(amount) + direction * 10000) / 100;
  return validSellingPrice(next, product) ? next : amount;
}
export function sellingPriceOptions(product: AnnualWarrantyProduct | undefined, current = 0): number[] {
  const anchor = product?.retail_price || current;
  if (!Number.isFinite(anchor) || anchor <= 0) return [];
  const lo = product?.min_price || 0;
  const hi = product?.max_price ?? anchor + 2000;
  const first = anchor - Math.floor(Math.max(0, anchor - lo) / 100) * 100;
  const out: number[] = [];
  for (let v = first; v <= hi; v += 100) if (v >= lo) out.push(v);
  return out;
}
export const potentialProfit = (retail: number, cost: number) => (priceInPence(retail) - priceInPence(cost)) / 100;
export const annualProductActive = (product: AnnualWarrantyProduct) => product.active && (product.months !== 48 || product.approvals_complete === true);

export function isAnnualQuoteSnapshot(options: Record<string, unknown> | null | undefined) {
  return options?.price_basis === 'annual-product' && typeof options.product_id === 'string' && typeof options.pricing_version === 'string';
}