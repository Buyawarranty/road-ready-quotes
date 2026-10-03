import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomerQuoteUrl, decodeCustomerQuote, customerQuoteMessage } from '../customerQuoteSharing';
import { calculateFullWarranty } from '../fullWarrantyConfiguration';

describe('Customer quote separation', () => {
  const quote = { coverTitle: 'Full Warranty Cover', price: 177, specs: [{ label: 'Term', value: '12 months', dealer_price: 118 }], vehicle: { reg: 'B11CSD', make: 'AUDI', email: 'private@example.test', dealer_price: 118 }, dealer_price: 118, margin: 59 };
  test('shared tab receives only customer-safe fields, including nested vehicle and specs', () => {
    const decoded = decodeCustomerQuote(buildCustomerQuoteUrl(quote).split('#')[1]);
    assert.equal(decoded?.price, 177);
    assert.deepEqual(decoded?.vehicle, { reg: 'B11CSD', make: 'AUDI' });
    assert.deepEqual(decoded?.specs, [{ label: 'Term', value: '12 months' }]);
    assert.ok(!JSON.stringify(decoded).includes('dealer_price'));
    assert.ok(!JSON.stringify(decoded).includes('private@example.test'));
    assert.ok(!JSON.stringify(decoded).includes('margin'));
  });
  test('email and WhatsApp message contain selling price only', () => {
    const message = customerQuoteMessage(quote, 'https://example.test/customer-quote');
    assert.ok(message.includes('£177.00'));
    assert.ok(!message.includes('118'));
    assert.ok(!message.includes('private@example.test'));
  });
  test('malformed quotes fail safely', () => assert.equal(decodeCustomerQuote('bad'), null));
});

describe('Existing commercial prices retained pending approval', () => {
  test('age-mileage retains £118 versus £135.70 full-cover monthly price', () => {
    assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', []).wholesale, 118);
    assert.equal(calculateFullWarranty('50', '70', 'none', '1000', []).wholesale, 135.7);
  });
  test('proposed protections cannot change the payable price', () => {
    assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', ['ev-battery', 'aircon']).wholesale, 118);
  });
  test('existing selectable add-on prices remain unchanged', () => {
    assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', ['wear', 'breakdown', 'mot', 'diagnostics']).wholesale, 141);
  });
});