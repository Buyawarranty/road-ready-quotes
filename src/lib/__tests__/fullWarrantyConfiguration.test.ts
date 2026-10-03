import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFullWarranty, liveWarrantyAddOns, warrantyClaims, pendingWarrantyClaims } from '../fullWarrantyConfiguration';

describe('Approved full warranty add-ons', () => {
  const approved = [
    ['wear-extension', 20], ['emissions', 15], ['air-suspension', 25],
    ['wet-belt', 12], ['rental', 10], ['aircon', 8], ['infotainment', 8],
    ['adas', 12], ['ev-battery', 25], ['suspension', 10],
  ] as const;
  it('uses exactly the ten replacement options', () => {
    assert.deepEqual(liveWarrantyAddOns.map(a => a.key), approved.map(([key]) => key));
  });
  for (const [key, price] of approved) {
    it(`${key} costs £${price} per month excluding VAT`, () => {
      assert.equal(liveWarrantyAddOns.find(a => a.key === key)?.price, price);
      assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', [key]).wholesale, 118 + price);
    });
  }
  it('charges each selected protection once', () => {
    assert.equal(calculateFullWarranty('50', '70', 'age-mileage', '1000', ['wear-extension', 'wear-extension']).wholesale, 138);
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