import { describe, expect, it } from 'vitest';
import { dealerJourneyWithVehicle, emptyDealerJourney, isEditableDealerQuote, isNewDealerQuote, dealerLoginTarget, dealerQuoteProgress, dealerQuoteCheckoutError, DEALER_NEW_QUOTE_URL } from '../dealerJourneyState';
import type { DealerJourneyState } from '@/contexts/DealerJourneyContext';

const firstSale: DealerJourneyState = {
  quoteId: 'first-sale', vehicle: { reg: 'LX11 CAD', mileage: '42000' },
  customer: { name: 'First buyer', email: 'first@example.com', phone: '07123456789', address_line1: '1 High Street', town: 'London', postcode: 'SW1A 1AA' },
  plan: { plan_type: 'gold', duration_months: 12, dealer_price: 99, retail_price: 599 }, discount_pct: 5,
};

describe('another dealer warranty starts independently', () => {
  it('clears the previous customer, vehicle, plan and quote for an explicit new warranty', () => {
    expect(emptyDealerJourney()).toEqual({ quoteId: null, vehicle: null, customer: null, plan: null, discount_pct: 0 });
    const url = new URL(DEALER_NEW_QUOTE_URL, 'https://pandaprotect.co.uk');
    expect(isNewDealerQuote(url.pathname, url.search)).toBe(true);
  });
  it('detaches the previous customer and quote when another registration is selected', () => {
    expect(dealerJourneyWithVehicle(firstSale, { reg: 'AB12 CDE' })).toEqual({ ...firstSale, vehicle: { reg: 'AB12 CDE' }, quoteId: null, customer: null, plan: null });
    expect(firstSale.quoteId).toBe('first-sale');
  });
  it('keeps a resumed quote and customer when only its mileage changes', () => {
    expect(dealerJourneyWithVehicle(firstSale, { reg: 'lx11cad', mileage: '43000' })).toEqual({ ...firstSale, vehicle: { reg: 'lx11cad', mileage: '43000' } });
  });
  it('keeps back-navigation and payment returns out of the new-warranty reset', () => {
    expect(isNewDealerQuote('/dealer-portal/quote/pricing', '?reg=AB12CDE')).toBe(false);
    expect(isNewDealerQuote('/dealer-portal/quote/confirmation', '?new=1')).toBe(false);
  });
  it.each(['paid', 'invoiced', 'converted', 'completed', 'sent', 'cancelled', 'refunded', 'closed'])('does not allow a settled %s quote to be resaved as draft', status => {
    expect(isEditableDealerQuote(status)).toBe(false);
  });
  it.each(['draft', 'pending', 'quoted', 'awaiting_panda'])('allows an unfinished %s quote to resume', status => {
    expect(isEditableDealerQuote(status)).toBe(true);
  });
  it('protects a paid quote even when its status was overwritten as draft', () => {
    expect(isEditableDealerQuote('draft', '2026-11-21T19:25:46.204139Z')).toBe(false);
    expect(isEditableDealerQuote('draft', null)).toBe(true);
  });
});

describe('processed quotes open warranties instead of resuming', () => {
  it.each(['paid', 'invoiced', 'converted', 'completed', 'sent', 'cancelled', 'refunded', 'closed'])('blocks new checkout or quote email for a settled %s quote', status => {
    expect(dealerQuoteCheckoutError({ status })).not.toBeNull();
  });
  it('blocks a missing quote and a historic paid draft', () => {
    expect(dealerQuoteCheckoutError(null)).not.toBeNull();
    expect(dealerQuoteCheckoutError({ status: 'draft', paid_at: '2026-11-21T19:25:46.204139Z' })).not.toBeNull();
  });
  it.each(['draft', 'pending', 'quoted', 'awaiting_panda'])('permits an unfinished %s checkout', status => {
    expect(dealerQuoteCheckoutError({ status, paid_at: null })).toBeNull();
  });
  it('recognizes the paid screenshot sale regardless of its saved step', () => {
    expect(dealerQuoteProgress({ status: 'paid', paid_at: '2026-11-24T15:56:51.952564Z', vehicle_reg: 'FP14 UBL' }))
      .toEqual({ canResume: false, settledLabel: 'Completed', warrantyHref: '/dealer-portal/warranties?search=FP14UBL' });
  });
  it('recognizes a paid timestamp even when the historic status says draft', () => {
    expect(dealerQuoteProgress({ status: 'draft', paid_at: '2026-11-21T19:25:46.204139Z' }).settledLabel).toBe('Completed');
    expect(dealerQuoteProgress({ status: 'draft', paid_at: '2026-11-21T19:25:46.204139Z' }).canResume).toBe(false);
  });
  it.each(['converted', 'completed', 'sent'])('does not resume a processed %s quote', status => {
    expect(dealerQuoteProgress({ status }).canResume).toBe(false);
    expect(dealerQuoteProgress({ status }).settledLabel).toBe('Completed');
  });
  it('distinguishes issued invoices from paid warranties', () => {
    expect(dealerQuoteProgress({ status: 'invoiced' }).settledLabel).toBe('Completed · invoice issued');
    expect(dealerQuoteProgress({ status: 'invoiced' }).canResume).toBe(false);
  });
  it.each([['cancelled', 'Cancelled'], ['refunded', 'Refunded'], ['closed', 'Closed']])('keeps %s records settled', (status, label) => {
    expect(dealerQuoteProgress({ status, paid_at: '2026-11-24T15:56:51Z' }).settledLabel).toBe(label);
    expect(dealerQuoteProgress({ status }).canResume).toBe(false);
  });
  it.each(['draft', 'pending', 'quoted', 'awaiting_panda'])('keeps genuine %s quotes resumable', status => {
    expect(dealerQuoteProgress({ status, paid_at: null }).canResume).toBe(true);
    expect(dealerQuoteProgress({ status, paid_at: null }).settledLabel).toBeNull();
  });
});

describe('dealer sign-in handoff', () => {
  it('preserves fresh-sale parameters while adding the registration', () => {
    expect(dealerLoginTarget('/dealer-portal/quote/pricing?new=1', 'AB12 CDE')).toBe('/dealer-portal/quote/pricing?new=1&reg=AB12+CDE');
  });
  it('preserves signed payment-return parameters', () => {
    expect(dealerLoginTarget('/dealer-portal/quote/confirmation?method=pay_now&id=sale&session_id=session', 'AB12CDE')).toBe('/dealer-portal/quote/confirmation?method=pay_now&id=sale&session_id=session&reg=AB12CDE');
  });
  it('keeps the registration already belonging to the requested journey', () => {
    expect(dealerLoginTarget('/dealer-portal/quote/pricing?reg=XY99ZZZ', 'AB12CDE')).toBe('/dealer-portal/quote/pricing?reg=XY99ZZZ');
  });
  it.each([null, '//example.com', '/dealer-other', '/dealer-portal/login', '/dealer-portal/signup/', '/auth', '/dealer-portal/../auth', '/dealer-portal/\\example.com'])('rejects invalid or looping destination %s', redirect => {
    expect(dealerLoginTarget(redirect, 'AB12CDE')).toBe('/dealer-portal/dashboard');
  });

  it('shows a paid quote as Cancelled or Refunded once its warranty is cancelled or refunded', () => {
    const paid = { status: 'paid', paid_at: '2026-11-24T15:56:51Z', vehicle_reg: 'FP14 UBL' };
    expect(dealerQuoteProgress({ ...paid, cover_status: 'cancelled' }).settledLabel).toBe('Cancelled');
    expect(dealerQuoteProgress({ ...paid, cover_status: 'refunded' }).settledLabel).toBe('Refunded');
    expect(dealerQuoteProgress({ ...paid, cover_status: 'cancelled' }).canResume).toBe(false);
    expect(dealerQuoteProgress({ ...paid, cover_status: 'active' }).settledLabel).toBe('Completed');
  });
});
