import { describe, expect, it } from 'vitest';
import { dealerSaleAmount, dealerSalePaymentLabel, isCompletedDealerSale, isCountedDealerSale, isOutstandingDealerInvoice } from '../dealerSales';

describe('dealer sales', () => {
  it('uses the stored final amount for the reported £1.19 sale', () => {
    expect(dealerSaleAmount({ final_amount: 1.19 })).toBe(1.19);
  });

  it('accepts database numeric values returned as strings', () => {
    expect(dealerSaleAmount({ final_amount: '719.00' })).toBe(719);
  });

  it.each(['Active', 'Paid', 'Invoice pending'])('counts %s sales', (status) => {
    expect(isCountedDealerSale({ status })).toBe(true);
  });

  it.each(['cancelled', 'Cancelled', 'refunded', 'Refunded'])('excludes %s sales from revenue', (status) => {
    expect(isCountedDealerSale({ status })).toBe(false);
  });

  it('keeps the paid £1.19 card sale out of outstanding invoices and shows it in completed sales', () => {
    const sale = { payment_status: 'paid', final_amount: 1.19, stripe_session_id: 'cs_live_example' };
    expect(isOutstandingDealerInvoice(sale)).toBe(false);
    expect(isCompletedDealerSale(sale)).toBe(true);
    expect(dealerSalePaymentLabel(sale)).toBe('Card payment');
  });

  it.each(['invoice_pending', 'overdue'])('includes %s account sales in outstanding invoices', (payment_status) => {
    expect(isOutstandingDealerInvoice({ payment_status })).toBe(true);
  });

  it('keeps unfinished card checkouts out of outstanding invoices', () => {
    expect(isOutstandingDealerInvoice({ payment_status: 'pending' })).toBe(false);
  });

  it('identifies a settled 30-day invoice in completed sales', () => {
    expect(dealerSalePaymentLabel({ payment_status: 'paid', final_amount: 300, stripe_session_id: 'invoice:customer-1' })).toBe('Invoice paid');
  });
});
