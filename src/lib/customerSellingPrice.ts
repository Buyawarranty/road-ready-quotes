export function marginSellingPrice(costIncludingVat: number, marginPercent: number): number {
  if (!Number.isFinite(costIncludingVat) || costIncludingVat <= 0 || !Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent >= 100) return NaN;
  return Math.round(costIncludingVat / (1 - marginPercent / 100) * 100) / 100;
}
