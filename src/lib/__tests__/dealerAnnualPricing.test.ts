import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { annualProductActive, isAnnualQuoteSnapshot, potentialProfit, stepSellingPrice, validSellingPrice } from '../dealerAnnualPricing';
const product = { months: 24, dealer_price: 200, retail_price: 700, min_price: 200, max_price: 1400, active: true };
describe('Annual selling prices', () => {
  it('uses £100 dealer and £400 retail for one year rather than a legacy £141.60 snapshot', () => {
    const annual = { ...product, months: 12, dealer_price: 100, retail_price: 400 };
    const legacy = { dealer_price: 141.6, selected_options: { warranty_type: 'fully-covered' } };
    assert.equal(isAnnualQuoteSnapshot(legacy.selected_options), false);
    assert.equal(isAnnualQuoteSnapshot(legacy.selected_options) ? legacy.dealer_price : annual.dealer_price, 100);
    assert.equal(annual.retail_price, 400);
    assert.equal(potentialProfit(annual.retail_price, annual.dealer_price), 300);
  });
  it('preserves explicitly identified annual quotes only', () => {
    assert.equal(isAnnualQuoteSnapshot({ price_basis: 'annual-product', product_id: 'annual', pricing_version: 'annual-v1' }), true);
    assert.equal(isAnnualQuoteSnapshot({ price_basis: 'annual-product' }), false);
  });
  it('increases by exactly £100 per tap', () => { assert.equal(stepSellingPrice(700, 1, product), 800); assert.equal(stepSellingPrice(800, 1, product), 900); });
  it('decreases by exactly £100 per tap', () => assert.equal(stepSellingPrice(900, -1, product), 800));
  it('shows retail minus wholesale as potential profit', () => { assert.equal(potentialProfit(700, 200), 500); assert.equal(potentialProfit(800, 200), 600); });
  it('respects configured minimum and maximum', () => { assert.equal(stepSellingPrice(200, -1, product), 200); assert.equal(stepSellingPrice(1400, 1, product), 1400); assert.equal(validSellingPrice(1400.01, product), false); });
  it('keeps currency accurate to the penny', () => assert.equal(stepSellingPrice(700.01, 1, product), 800.01));
  it('gates four years on completed approvals', () => { assert.equal(annualProductActive({ ...product, months: 48 }), false); assert.equal(annualProductActive({ ...product, months: 48, approvals_complete: true, active: false }), false); });
});