import { describe, expect, it } from 'vitest';
import { canAuthorizeDealerCreditRole, canRequestDealerCredit, countsAsPaidWarranty, introFreeRemaining, qualifiesForIntroFree } from '../../../supabase/functions/_shared/dealerIntroOffer';

describe('dealer 3+3 introductory offer', () => {
  it('starts after three paid warranties and tracks exactly three free redemptions', () => {
    expect(introFreeRemaining(2, 0)).toBe(0);
    expect(introFreeRemaining(3, 0)).toBe(3);
    expect(introFreeRemaining(3, 1)).toBe(2);
    expect(introFreeRemaining(3, 2)).toBe(1);
    expect(introFreeRemaining(3, 3)).toBe(0);
  });

  it('applies automatically only to qualifying cover up to three years', () => {
    expect(qualifiesForIntroFree(3, 0, 36)).toBe(true);
    expect(qualifiesForIntroFree(3, 0, 48)).toBe(false);
    expect(qualifiesForIntroFree(3, 3, 12)).toBe(false);
  });

  it('does not count free warranties toward the ten-paid credit threshold', () => {
    expect(countsAsPaidWarranty('paid', 99)).toBe(true);
    expect(countsAsPaidWarranty('paid', 0)).toBe(false);
    expect(countsAsPaidWarranty('invoice_pending', 99)).toBe(false);
  });
});

describe('dealer credit authorisation', () => {
  it('allows a request only after 10 paid warranties with a clear account and no pending request', () => {
    expect(canRequestDealerCredit({ paidCount: 9 })).toBe(false);
    expect(canRequestDealerCredit({ paidCount: 10 })).toBe(true);
    expect(canRequestDealerCredit({ paidCount: 10, requestStatus: 'pending' })).toBe(false);
    expect(canRequestDealerCredit({ paidCount: 10, overdueCount: 1 })).toBe(false);
    expect(canRequestDealerCredit({ paidCount: 10, mode: 'allow' })).toBe(false);
  });

  it('allows only Admin and Super Admin to review requests', () => {
    expect(canAuthorizeDealerCreditRole('admin')).toBe(true);
    expect(canAuthorizeDealerCreditRole('super_admin')).toBe(true);
    expect(canAuthorizeDealerCreditRole('manager')).toBe(false);
    expect(canAuthorizeDealerCreditRole('dealer')).toBe(false);
  });
});
