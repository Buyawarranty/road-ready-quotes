export function dealerQuoteEconomics(cost: number, sellingPrice: number) {
  const profit = Math.round((sellingPrice - cost) * 100) / 100;
  return { profit, margin: sellingPrice > 0 ? (sellingPrice - cost) / sellingPrice * 100 : 0 };
}