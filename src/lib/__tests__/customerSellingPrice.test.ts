import { it } from 'node:test';
import assert from 'node:assert/strict';
import { marginSellingPrice } from '../customerSellingPrice';
it('20% true profit margin on £100 gives £125 selling price', () => {
  assert.equal(marginSellingPrice(100, 20), 125);
});
it('100% margin is invalid rather than infinite', () => {
  assert.ok(Number.isNaN(marginSellingPrice(100, 100)));
});
it('VAT-inclusive £141.60 cost at 20% margin gives £177', () => {
  assert.equal(marginSellingPrice(141.6, 20), 177);
});
