export const DEALER_INTRO_PAID_TARGET = 3;
export const DEALER_INTRO_FREE_TOTAL = 3;
export const DEALER_INTRO_MAX_MONTHS = 36;
export const DEALER_CREDIT_PAID_TARGET = 6;

export function introFreeRemaining(paidCount: number, redemptionCount: number): number {
  return Math.max(0, Math.min(DEALER_INTRO_FREE_TOTAL, Math.max(0, paidCount)) - Math.max(0, redemptionCount));
}

export function qualifiesForIntroFree(paidCount: number, redemptionCount: number, durationMonths: number): boolean {
  return durationMonths >= 1 && durationMonths <= DEALER_INTRO_MAX_MONTHS
    && introFreeRemaining(paidCount, redemptionCount) > 0;
}

/** Free introductory warranties are active paid cover with a zero charge, not new paid purchases. */
export function countsAsPaidWarranty(paymentStatus: string | null | undefined, finalAmount: number | null | undefined): boolean {
  return paymentStatus === 'paid' && Number(finalAmount ?? 0) > 0;
}

export function canAuthorizeDealerCreditRole(role: string): boolean {
  return role === 'admin' || role === 'super_admin';
}

/** 30-day invoice (finance) requests are also approved by the accounts team. */
export function canReviewDealerCreditRequestRole(role: string): boolean {
  return canAuthorizeDealerCreditRole(role) || role === 'accounts' || role === 'accounts_manager';
}

export function canRequestDealerCredit(input: {
  paidCount: number;
  required?: number;
  mode?: 'auto' | 'allow' | 'block';
  overdueCount?: number;
  requestStatus?: 'pending' | 'approved' | 'rejected' | null;
}): boolean {
  return (input.mode ?? 'auto') === 'auto'
    && input.paidCount >= (input.required ?? DEALER_CREDIT_PAID_TARGET)
    && (input.overdueCount ?? 0) === 0
    && input.requestStatus !== 'pending';
}
