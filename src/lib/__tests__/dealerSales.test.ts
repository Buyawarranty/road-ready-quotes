import { describe, expect, it } from 'vitest';
import { dealerSaleAmount, isCountedDealerSale } from '../dealerSales';

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
});
