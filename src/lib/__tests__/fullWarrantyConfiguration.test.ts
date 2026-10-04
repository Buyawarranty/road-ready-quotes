import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFullWarranty, liveWarrantyAddOns, warrantyClaims, pendingWarrantyClaims, warrantyTerms, warrantyLabour, warrantyPriceWithVat } from '../fullWarrantyConfiguration';

describe('Dealer warranty configuration', () => {
  it('offers only 3, 6, 12, 24 and 36 months of cover', () => {
    assert.deepEqual(warrantyTerms.map(option => option.months), [3, 6, 12, 24, 36]);
    assert.deepEqual(warrantyTerms.map(option => Number(option.value)), [3, 6, 12, 24, 36]);
  });
  it('offers only £40, £70, £100 and £150 hourly labour rates', () => {
    assert.deepEqual(warrantyLabour.map(option => Number(option.value)), [40, 70, 100, 150]);
  });
});

describe('Approved full warranty add-ons', () => {
  const approved = [
    ['emissions', 15], ['air-suspension', 25],
    ['wet-belt', 12], ['rental', 10], ['aircon', 8], ['infotainment', 8],
    ['adas', 12], ['ev-battery', 25], ['suspension', 10],
  ] as const;
  it('uses exactly the nine replacement options', () => {
    assert.deepEqual(liveWarrantyAddOns.map(a => a.key), approved.map(([key]) => key));
  });
  for (const [key, price] of approved) {
    it(`${key} costs £${price} for the full warranty excluding VAT`, () => {
      assert.equal(liveWarrantyAddOns.find(a => a.key === key)?.price, price);
      assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', [key]).wholesale, 118 + price);
    });
  }
  it('charges each selected protection once', () => {
    assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', ['emissions', 'emissions']).wholesale, 133);
  });
});

describe('Full warranty claim limits', () => {
  it('offers 1000, 2000, 3000 and pending 5000 instead of 750', () => {
    assert.deepEqual([...warrantyClaims, ...pendingWarrantyClaims].map(a => Number(a.value)), [1000, 2000, 3000, 5000]);
  });
  it('blocks 5000 from charging until its price is approved', () => {
    assert.equal(pendingWarrantyClaims[0].disabled, true);
    assert.throws(() => calculateFullWarranty('50', '70', 'age-mileage', '5000', []));
  });
  it('removes 750 from new quote pricing', () => {
    assert.throws(() => calculateFullWarranty('50', '70', 'age-mileage', '750', []));
  });
});
describe('Full warranty payment', () => {
  it('charges £118 for the entire warranty rather than multiplying by 12', () => {
    assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', []).total, 118);
  });
  it('adds £23.60 VAT to £118 for a final payment of £141.60', () => {
    assert.deepEqual(warrantyPriceWithVat(118), { net: 118, vat: 23.6, total: 141.6 });
  });
});
