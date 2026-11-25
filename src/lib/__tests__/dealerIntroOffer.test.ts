import { describe, expect, it } from 'vitest';
import { canAuthorizeDealerCreditRole, canReviewDealerCreditRequestRole, canRequestDealerCredit, countsAsPaidWarranty, introFreeRemaining, qualifiesForIntroFree } from '../../../supabase/functions/_shared/dealerIntroOffer';

describe('dealer buy one get one free offer', () => {
  it('earns the first free warranty after one paid warranty', () => {
    expect(introFreeRemaining(0, 0)).toBe(0);
    expect(introFreeRemaining(1, 0)).toBe(1);
    expect(introFreeRemaining(1, 1)).toBe(0);
  });
  it('repeats pay one get one free for the second purchase', () => {
    expect(introFreeRemaining(2, 1)).toBe(1);
    expect(introFreeRemaining(2, 2)).toBe(0);
  });
  it('caps the offer at three free warranties even after more paid purchases', () => {
    expect(introFreeRemaining(3, 0)).toBe(3);
    expect(introFreeRemaining(3, 1)).toBe(2);
    expect(introFreeRemaining(3, 2)).toBe(1);
    expect(introFreeRemaining(3, 3)).toBe(0);
    expect(introFreeRemaining(6, 3)).toBe(0);
  });

  it('applies automatically only to qualifying cover up to three years', () => {
    expect(qualifiesForIntroFree(1, 0, 36)).toBe(true);
    expect(qualifiesForIntroFree(1, 0, 0)).toBe(false);
    expect(qualifiesForIntroFree(3, 0, 48)).toBe(false);
    expect(qualifiesForIntroFree(3, 3, 12)).toBe(false);
  });

  it('does not count free warranties toward paid credit or further free entitlements', () => {
    expect(countsAsPaidWarranty('paid', 99)).toBe(true);
    expect(countsAsPaidWarranty('paid', 0)).toBe(false);
    expect(countsAsPaidWarranty('invoice_pending', 99)).toBe(false);
  });
});

describe('dealer credit authorisation', () => {
  it('allows a request only after 6 paid warranties with a clear account and no pending request', () => {
    expect(canRequestDealerCredit({ paidCount: 5 })).toBe(false);
    expect(canRequestDealerCredit({ paidCount: 6 })).toBe(true);
    expect(canRequestDealerCredit({ paidCount: 6, requestStatus: 'pending' })).toBe(false);
    expect(canRequestDealerCredit({ paidCount: 6, overdueCount: 1 })).toBe(false);
    expect(canRequestDealerCredit({ paidCount: 6, mode: 'allow' })).toBe(false);
  });

  it('allows only Admin and Super Admin to review requests', () => {
    expect(canAuthorizeDealerCreditRole('admin')).toBe(true);
    expect(canAuthorizeDealerCreditRole('super_admin')).toBe(true);
    expect(canAuthorizeDealerCreditRole('manager')).toBe(false);
    expect(canAuthorizeDealerCreditRole('dealer')).toBe(false);
  });
});

describe('30-day invoice request approvers', () => {
  it('lets accounts staff approve but not BDMs', () => {
    expect(canReviewDealerCreditRequestRole('accounts')).toBe(true);
    expect(canReviewDealerCreditRequestRole('accounts_manager')).toBe(true);
    expect(canReviewDealerCreditRequestRole('admin')).toBe(true);
    expect(canReviewDealerCreditRequestRole('bdm')).toBe(false);
  });
});
