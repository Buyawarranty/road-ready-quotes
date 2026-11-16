import { describe, expect, it } from 'vitest';
import { dealerPurchaseRecipients, dealerQuoteStatusForMethod } from '../../../supabase/functions/_shared/dealerSaleFulfilment';

describe('dealer sale fulfilment', () => {
  it('marks card and free sales paid rather than leaving the quote draft', () => {
    expect(dealerQuoteStatusForMethod('pay_now')).toBe('paid');
    expect(dealerQuoteStatusForMethod('intro_free')).toBe('paid');
  });

  it('marks authorised account sales invoiced', () => {
    expect(dealerQuoteStatusForMethod('invoice')).toBe('invoiced');
  });

  it('prepares purchase emails for both dealer and customer', () => {
    expect(dealerPurchaseRecipients('dealer@example.com', 'customer@example.com')).toEqual({
      dealer: 'dealer@example.com',
      customer: 'customer@example.com',
    });
  });

  it('does not treat an assisted blank customer email as a recipient', () => {
    expect(dealerPurchaseRecipients('dealer@example.com', '')).toEqual({
      dealer: 'dealer@example.com',
      customer: null,
    });
  });
});
