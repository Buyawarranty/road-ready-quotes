import { describe, expect, it } from 'vitest';
import { dealerSaleAmount, dealerSalePaymentLabel, isCompletedDealerSale, isCountedDealerSale, isOutstandingDealerInvoice, isPaidDealerPurchase } from '../dealerSales';

describe('dealer sales', () => {
  it('counts £99 paid cover as a genuine purchase', () => {
    expect(isPaidDealerPurchase({ final_amount: 99, payment_status: 'paid', status: 'Active' })).toBe(true);
  });
  it('keeps £0 free cover in issued warranties but out of paid purchases', () => {
    const free = { final_amount: 0, payment_status: 'paid', status: 'Active' };
    expect(isCompletedDealerSale(free)).toBe(true);
    expect(isPaidDealerPurchase(free)).toBe(false);
  });
  it.each(['Cancelled', 'Refunded'])('excludes %s purchases despite their old paid status', status => {
    expect(isPaidDealerPurchase({ final_amount: 99, payment_status: 'paid', status })).toBe(false);
  });
  it('excludes unpaid £99 previews from paid totals', () => {
    expect(isPaidDealerPurchase({ final_amount: 99, payment_status: 'pending', status: 'Pending' })).toBe(false);
  });
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
