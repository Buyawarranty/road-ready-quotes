/** Panda cancellation rules: full refund within 14 days; afterwards the unused part pro-rata, less 14% and a £60 admin fee. */
export const COOLING_OFF_DAYS = 14;
export const ADMIN_FEE = 60;
export const EARLY_TERMINATION_RATE = 0.14;
const DAY = 86400000;

/** Cover length in months from payment_type text like "12months", "2 years", "36"; defaults to 12. */
export function coverMonths(paymentType?: string | null): number {
  const t = (paymentType || '').toLowerCase();
  const n = parseInt(t.match(/\d+/)?.[0] || '', 10);
  if (!n) return 12;
  if (/year|yr/.test(t) || n <= 5) return n * 12;
  return n;
}

export const daysBetween = (from: string | Date, to: string | Date) =>
  Math.floor((new Date(to).getTime() - new Date(from).getTime()) / DAY);

export const isWithinCoolingOff = (start: string | Date, cancelled: string | Date) =>
  daysBetween(start, cancelled) <= COOLING_OFF_DAYS;

export function suggestedRefund(amount: number, start: string | Date, cancelled: string | Date, months = 12): number {
  if (!(amount > 0)) return 0;
  if (isWithinCoolingOff(start, cancelled)) return round(amount);
  const totalDays = months * 30.4375;
  const used = Math.max(0, daysBetween(start, cancelled));
  const unused = amount * Math.max(0, totalDays - used) / totalDays;
  return round(Math.max(0, unused * (1 - EARLY_TERMINATION_RATE) - ADMIN_FEE));
}
const round = (n: number) => Math.round(n * 100) / 100;

/** Test, £0–£10 and test-cancellation orders are excluded from cancellation analytics. */
export const isExcludedFromCancellationStats = (c: { status?: string | null; final_amount?: number | string | null; is_test_cancellation?: boolean | null }) =>
  !!c.is_test_cancellation || (Number(c.final_amount) || 0) <= 10 || (c.status || '').toLowerCase() === 'test purchase';
