export const DEALER_INTRO_PAID_TARGET = 3;
export const DEALER_INTRO_FREE_TOTAL = 3;
export const DEALER_INTRO_MAX_MONTHS = 36;
export const DEALER_CREDIT_PAID_TARGET = 10;

export function introFreeRemaining(paidCount: number, redemptionCount: number): number {
  if (paidCount < DEALER_INTRO_PAID_TARGET) return 0;
  return Math.max(0, DEALER_INTRO_FREE_TOTAL - Math.max(0, redemptionCount));
}

export function qualifiesForIntroFree(paidCount: number, redemptionCount: number, durationMonths: number): boolean {
  return durationMonths >= 1 && durationMonths <= DEALER_INTRO_MAX_MONTHS
    && introFreeRemaining(paidCount, redemptionCount) > 0;
}

/** Free introductory warranties are active paid cover with a zero charge, not new paid purchases. */
export function countsAsPaidWarranty(paymentStatus: string | null | undefined, finalAmount: number | null | undefined): boolean {
  return paymentStatus === 'paid' && Number(finalAmount ?? 0) > 0;
}
