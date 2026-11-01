import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { annualProductActive, boostForTerm, isAnnualQuoteSnapshot, potentialProfit, sellingPriceOptions, stepSellingPrice, validSellingPrice } from '../dealerAnnualPricing';
const product = { months: 24, dealer_price: 200, retail_price: 695, min_price: 200, max_price: 1400, active: true };
const oneYear = { months: 12, dealer_price: 100, retail_price: 395, min_price: 100, max_price: null, active: true };
const boostCfg = { active: true, claim_limit: 5000, dealer_price: 60, retail_price: 60, terms: [{ months: 12, dealer_price: 20, retail_price: 60 }, { months: 24, dealer_price: 40, retail_price: 100 }, { months: 36, dealer_price: 60, retail_price: 140 }] };
describe('Annual selling prices', () => {
  it('uses £100 dealer and £395 retail for one year rather than a legacy £141.60 snapshot', () => {
    const annual = { ...product, months: 12, dealer_price: 100, retail_price: 395 };
    const legacy = { dealer_price: 141.6, selected_options: { warranty_type: 'fully-covered' } };
    assert.equal(isAnnualQuoteSnapshot(legacy.selected_options), false);
    assert.equal(isAnnualQuoteSnapshot(legacy.selected_options) ? legacy.dealer_price : annual.dealer_price, 100);
    assert.equal(annual.retail_price, 395);
    assert.equal(potentialProfit(annual.retail_price, annual.dealer_price), 295);
  });
  it('preserves explicitly identified annual quotes only', () => {
    assert.equal(isAnnualQuoteSnapshot({ price_basis: 'annual-product', product_id: 'annual', pricing_version: 'annual-v1' }), true);
    assert.equal(isAnnualQuoteSnapshot({ price_basis: 'annual-product' }), false);
  });
  it('increases by exactly £100 per tap', () => { assert.equal(stepSellingPrice(695, 1, product), 795); assert.equal(stepSellingPrice(795, 1, product), 895); });
  it('decreases by exactly £100 per tap', () => assert.equal(stepSellingPrice(895, -1, product), 795));
  it('shows retail minus wholesale as potential profit', () => { assert.equal(potentialProfit(695, 200), 495); assert.equal(potentialProfit(795, 200), 595); });
  it('respects configured minimum and maximum', () => { assert.equal(stepSellingPrice(200, -1, product), 200); assert.equal(stepSellingPrice(1400, 1, product), 1400); assert.equal(validSellingPrice(1400.01, product), false); });
  it('keeps currency accurate to the penny', () => assert.equal(stepSellingPrice(695.01, 1, product), 795.01));
  it('gates four years on completed approvals', () => { assert.equal(annualProductActive({ ...product, months: 48 }), false); assert.equal(annualProductActive({ ...product, months: 48, approvals_complete: true, active: false }), false); });
  it('offers only selling prices ending in £5 and never below the minimum', () => {
    const opts = sellingPriceOptions(oneYear, 395);
    assert.ok(opts.includes(395));
    assert.ok(opts.every(value => value % 10 === 5));
    assert.ok(opts.every(value => value >= oneYear.min_price));
    assert.equal(opts[0], 195);
  });
  it('caps the price list at the admin maximum', () => {
    const opts = sellingPriceOptions(product, 695);
    assert.equal(opts[opts.length - 1], 1395);
    assert.ok(opts.every(value => value <= 1400));
  });
  it('keeps the £5 grid when stepping by £100', () => {
    assert.equal(stepSellingPrice(395, 1, oneYear), 495);
    assert.equal(stepSellingPrice(395, -1, oneYear), 295);
  });
  it('offers nothing when no price is configured', () => { assert.deepEqual(sellingPriceOptions(undefined, 0), []); });
});
describe('Claim limit boost prices', () => {
  it('uses the price set for the chosen warranty length', () => {
    assert.equal(boostForTerm(boostCfg, 12)?.dealer_price, 20);
    assert.equal(boostForTerm(boostCfg, 24)?.dealer_price, 40);
    assert.equal(boostForTerm(boostCfg, 36)?.dealer_price, 60);
    assert.equal(boostForTerm(boostCfg, 36)?.retail_price, 140);
  });
  it('keeps the £5,000 claim limit when a term price is applied', () => { assert.equal(boostForTerm(boostCfg, 36)?.claim_limit, 5000); });
  it('falls back to the standard boost price for a term without one', () => { assert.equal(boostForTerm(boostCfg, 48)?.dealer_price, 60); assert.equal(boostForTerm(boostCfg, 48)?.retail_price, 60); });
  it('offers nothing when the boost is not configured', () => { assert.equal(boostForTerm(undefined, 12), undefined); assert.equal(boostForTerm(null, 12), undefined); });
});
