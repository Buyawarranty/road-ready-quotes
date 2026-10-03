import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomerQuoteUrl, decodeCustomerQuote, customerQuoteMessage, adjustableQuotePrice } from '../customerQuoteSharing';
import { calculateFullWarranty } from '../fullWarrantyConfiguration';

describe('Customer quote separation', () => {
  const quote = { coverTitle: 'Full Warranty Cover', price: 177, specs: [{ label: 'Term', value: '12 months', dealer_price: 118 }], vehicle: { reg: 'B11CSD', make: 'AUDI', email: 'private@example.test', dealer_price: 118 }, dealer_price: 118, margin: 59 };
  test('shared tab receives only customer-safe fields, including nested vehicle and specs', () => {
    const decoded = decodeCustomerQuote(buildCustomerQuoteUrl(quote).split('#')[1]);
    assert.equal(decoded?.price, 177);
    assert.deepEqual(JSON.parse(JSON.stringify(decoded?.vehicle)), { reg: 'B11CSD', make: 'AUDI' });
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
  test('age-mileage retains £118 versus £135.70 full-cover price', () => {
    assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', []).wholesale, 118);
    assert.equal(calculateFullWarranty('50', '70', 'none', '1000', []).wholesale, 135.7);
  });
  test('approved battery and air-conditioning add-ons enter the quote price', () => {
    assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', ['ev-battery', 'aircon']).wholesale, 151);
  });
  test('replaced add-ons are excluded from new quote charges', () => {
    assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', ['wear', 'breakdown', 'mot', 'diagnostics']).wholesale, 118);
  });
});

describe('Adjustable customer quotes', () => {
  const adjustable = {
    groups: [
      { label: 'Excess', options: [{ label: '£50', value: '50' }, { label: '£100', value: '100' }] },
      { label: 'Labour', options: [{ label: '£70/hr', value: '70' }] },
      { label: 'Parts', options: [{ label: 'Contribution', value: 'age-mileage' }] },
      { label: 'Claim', options: [{ label: '£1,000', value: '1000' }] },
    ], selected: ['50', '70', 'age-mileage', '1000'], prices: [177, 164.61],
    extras: [{ key: 'mot', label: 'MOT protection', price: 6, dealer_price: 4 }],
    selectedExtras: [], baseIncluded: ['UK claims support'], margin: 20,
  };
  test('option changes select customer selling prices and extras', () => {
    assert.equal(adjustableQuotePrice(adjustable, ['100', '70', 'age-mileage', '1000'], ['mot']), 170.61);
  });
  test('adjustable URLs exclude nested dealer cost and margin', () => {
    const decoded = decodeCustomerQuote(buildCustomerQuoteUrl({ coverTitle: 'Warranty', price: 177, specs: [], adjustable }).split('#')[1]);
    assert.equal(decoded?.adjustable?.extras[0].price, 6);
    assert.ok(!JSON.stringify(decoded).includes('dealer_price'));
    assert.ok(!JSON.stringify(decoded).includes('margin'));
  });
  test('incomplete selling price matrices are rejected', () => {
    const bad = { coverTitle: 'Warranty', price: 177, specs: [], adjustable: { ...adjustable, prices: [177] } };
    assert.equal(decodeCustomerQuote(buildCustomerQuoteUrl(bad).split('#')[1]), null);
  });
});
