import { describe, test, expect } from 'bun:test';
import { buildCustomerQuoteUrl, decodeCustomerQuote, customerQuoteMessage } from '../customerQuoteSharing';
import { calculateFullWarranty } from '../fullWarrantyConfiguration';

describe('Customer quote separation', () => {
  const quote = { coverTitle: 'Full Warranty Cover', price: 177, specs: [{ label: 'Term', value: '12 months', dealer_price: 118 }], vehicle: { reg: 'B11CSD', make: 'AUDI', email: 'private@example.test', dealer_price: 118 }, dealer_price: 118, margin: 59 };
  test('shared tab receives only customer-safe fields, including nested vehicle and specs', () => {
    const decoded = decodeCustomerQuote(buildCustomerQuoteUrl(quote).split('#')[1]);
    expect(decoded?.price).toBe(177);
    expect(decoded?.vehicle).toEqual({ reg: 'B11CSD', make: 'AUDI' });
    expect(decoded?.specs).toEqual([{ label: 'Term', value: '12 months' }]);
    expect(JSON.stringify(decoded)).not.toContain('dealer_price');
    expect(JSON.stringify(decoded)).not.toContain('private@example.test');
    expect(JSON.stringify(decoded)).not.toContain('margin');
  });
  test('email and WhatsApp message contain selling price only', () => {
    const message = customerQuoteMessage(quote, 'https://example.test/customer-quote');
    expect(message).toContain('£177.00');
    expect(message).not.toContain('118');
    expect(message).not.toContain('private@example.test');
  });
  test('malformed quotes fail safely', () => expect(decodeCustomerQuote('bad')).toBeNull());
});

describe('Existing commercial prices retained pending approval', () => {
  test('age-mileage retains £118 versus £135.70 full-cover monthly price', () => {
    expect(calculateFullWarranty('50', '70', 'age-mileage', '1000', []).wholesale).toBe(118);
    expect(calculateFullWarranty('50', '70', 'none', '1000', []).wholesale).toBe(135.7);
  });
  test('proposed protections cannot change the payable price', () => {
    expect(calculateFullWarranty('50', '70', 'age-mileage', '1000', ['ev-battery', 'aircon']).wholesale).toBe(118);
  });
  test('existing selectable add-on prices remain unchanged', () => {
    expect(calculateFullWarranty('50', '70', 'age-mileage', '1000', ['wear', 'breakdown', 'mot', 'diagnostics']).wholesale).toBe(141);
  });
});