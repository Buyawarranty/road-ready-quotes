import { describe, expect, it } from 'vitest';
import { dealerPurchaseRecipients, dealerQuoteStatusForMethod, syncDealerSale } from '../../../supabase/functions/_shared/dealerSaleFulfilment';

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

  it.each(['paid', 'invoiced'] as const)('creates missing portal details after %s sale completion', async quoteStatus => {
    const calls: Array<[string, unknown]> = [];
    const admin = { rpc: async (name: string, body: unknown) => {
      calls.push([name, body]);
      return { data: { customer_id: 'sale-one' }, error: null };
    } };
    await syncDealerSale(admin, { customerId: 'sale-one', quoteStatus });
    expect(calls).toEqual([
      ['complete_dealer_sale', { p_customer_id: 'sale-one', p_dealer_quote_id: null, p_stripe_session_id: null, p_quote_status: quoteStatus }],
      ['ensure_dealer_customer_portal_policy', { p_customer_id: 'sale-one' }],
    ]);
  });
});
