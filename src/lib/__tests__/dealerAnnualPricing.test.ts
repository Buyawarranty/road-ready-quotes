import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { annualProductActive, boostForTerm, isAnnualQuoteSnapshot, potentialProfit, sellingPriceOptions, stepSellingPrice, validSellingPrice } from '../dealerAnnualPricing';
const product = { months: 24, dealer_price: 199, retail_price: 899, min_price: 199, max_price: 1399, active: true };
const oneYear = { months: 12, dealer_price: 99, retail_price: 599, min_price: 99, max_price: null, active: true };
const boostCfg = { active: true, claim_limit: 5000, dealer_price: 60, retail_price: 360, terms: [{ months: 12, dealer_price: 20, retail_price: 120 }, { months: 24, dealer_price: 40, retail_price: 240 }, { months: 36, dealer_price: 60, retail_price: 360 }] };
describe('Annual selling prices', () => {
  it('uses £99 dealer and £599 retail for one year rather than a legacy £141.60 snapshot', () => {
    const annual = { ...product, months: 12, dealer_price: 99, retail_price: 599 };
    const legacy = { dealer_price: 141.6, selected_options: { warranty_type: 'fully-covered' } };
    assert.equal(isAnnualQuoteSnapshot(legacy.selected_options), false);
    assert.equal(isAnnualQuoteSnapshot(legacy.selected_options) ? legacy.dealer_price : annual.dealer_price, 99);
    assert.equal(annual.retail_price, 599);
    assert.equal(potentialProfit(annual.retail_price, annual.dealer_price), 500);
  });
  it('preserves explicitly identified annual quotes only', () => {
    assert.equal(isAnnualQuoteSnapshot({ price_basis: 'annual-product', product_id: 'annual', pricing_version: 'annual-v1' }), true);
    assert.equal(isAnnualQuoteSnapshot({ price_basis: 'annual-product' }), false);
  });
  it('increases by exactly £100 per tap', () => { assert.equal(stepSellingPrice(699, 1, product), 799); assert.equal(stepSellingPrice(799, 1, product), 899); });
  it('decreases by exactly £100 per tap', () => assert.equal(stepSellingPrice(899, -1, product), 799));
  it('shows retail minus wholesale as potential profit', () => { assert.equal(potentialProfit(899, 199), 700); assert.equal(potentialProfit(999, 199), 800); });
  it('respects configured minimum and maximum', () => { assert.equal(stepSellingPrice(199, -1, product), 199); assert.equal(stepSellingPrice(1399, 1, product), 1399); assert.equal(validSellingPrice(1399.01, product), false); });
  it('keeps currency accurate to the penny', () => assert.equal(stepSellingPrice(700.01, 1, product), 800.01));
  it('gates four years on completed approvals', () => { assert.equal(annualProductActive({ ...product, months: 48 }), false); assert.equal(annualProductActive({ ...product, months: 48, approvals_complete: true, active: false }), false); });
  it('offers £100 steps from the £599 RRP and never below the minimum', () => {
    const opts = sellingPriceOptions(oneYear, 499);
    assert.ok(opts.includes(599));
    assert.ok(opts.every(value => (value - 99) % 100 === 0));
    assert.ok(opts.every(value => value >= oneYear.min_price));
    assert.equal(opts[0], 99);
  });
  it('caps the price list at the admin maximum', () => {
    const opts = sellingPriceOptions(product, 899);
    assert.equal(opts[opts.length - 1], 1399);
    assert.ok(opts.every(value => value <= 1399));
  });
  it('keeps the £99 endings when stepping by £100', () => {
    assert.equal(stepSellingPrice(499, 1, oneYear), 599);
    assert.equal(stepSellingPrice(499, -1, oneYear), 399);
  });
  it('offers nothing when no price is configured', () => { assert.deepEqual(sellingPriceOptions(undefined, 0), []); });
});
describe('Claim limit boost prices', () => {
  it('uses the price set for the chosen warranty length', () => {
    assert.equal(boostForTerm(boostCfg, 12)?.dealer_price, 20);
    assert.equal(boostForTerm(boostCfg, 24)?.dealer_price, 40);
    assert.equal(boostForTerm(boostCfg, 36)?.dealer_price, 60);
    assert.equal(boostForTerm(boostCfg, 36)?.retail_price, 360);
  });
  it('keeps the £5,000 claim limit when a term price is applied', () => { assert.equal(boostForTerm(boostCfg, 36)?.claim_limit, 5000); });
  it('falls back to the standard boost price for a term without one', () => { assert.equal(boostForTerm(boostCfg, 60)?.dealer_price, 60); assert.equal(boostForTerm(boostCfg, 60)?.retail_price, 360); });
  it('offers nothing when the boost is not configured', () => { assert.equal(boostForTerm(undefined, 12), undefined); assert.equal(boostForTerm(null, 12), undefined); });
});
describe('Four-year warranty pricing', () => {
  const fourYear = { months: 48, dealer_price: 399, retail_price: 1599, min_price: 399, max_price: null, active: true, approvals_complete: true };
  const annualBoost = { active: true, claim_limit: 5000, dealer_price: 60, retail_price: 360, terms: [{ months: 12, dealer_price: 20, retail_price: 120 }, { months: 24, dealer_price: 40, retail_price: 240 }, { months: 36, dealer_price: 60, retail_price: 360 }, { months: 48, dealer_price: 80, retail_price: 480 }] };
  it('is available to sell now the user has approved it', () => { assert.equal(annualProductActive(fourYear), true); });
  it('earns £1,200 profit at the four-year recommended retail price', () => { assert.equal(potentialProfit(fourYear.retail_price, fourYear.dealer_price), 1200); });
  it('charges the four-year boost at £80 for the dealer and £480 for the customer', () => {
    assert.equal(boostForTerm(annualBoost, 48)?.dealer_price, 80);
    assert.equal(boostForTerm(annualBoost, 48)?.retail_price, 480);
    assert.equal(boostForTerm(annualBoost, 48)?.claim_limit, 5000);
  });
  it('prices four years with the boost at £479 cost and £2,079 for the customer', () => {
    const cost = fourYear.dealer_price + (boostForTerm(annualBoost, 48)?.dealer_price || 0);
    const retail = fourYear.retail_price + (boostForTerm(annualBoost, 48)?.retail_price || 0);
    assert.equal(cost, 479);
    assert.equal(retail, 2079);
    assert.equal(potentialProfit(retail, cost), 1600);
  });
});


describe('Approved boost net profit', () => {
  const config = { dealer_price: 60, retail_price: 360, terms: [
    { months: 12, dealer_price: 20, retail_price: 120 },
    { months: 24, dealer_price: 40, retail_price: 240 },
    { months: 36, dealer_price: 60, retail_price: 360 },
    { months: 48, dealer_price: 80, retail_price: 480 },
  ] };
  for (const [months, expected] of [[12, 100], [24, 200], [36, 300], [48, 400]]) {
    it(`adds £${expected} net profit for ${months / 12} years`, () => {
      const boost = boostForTerm(config, months);
      assert.ok(boost);
      assert.equal(potentialProfit(boost.retail_price, boost.dealer_price), expected);
      assert.equal(potentialProfit(1199 + boost.retail_price, 299 + boost.dealer_price), 900 + expected);
    });
  }
});
