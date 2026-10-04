import { it } from 'node:test';
import assert from 'node:assert/strict';
import { dealerQuoteEconomics } from '../dealerQuoteEconomics';

it('£118 net cost and £177 selling price yields £59 profit', () => {
  assert.equal(dealerQuoteEconomics(118, 177).profit, 59);
});
it('margin uses selling price, giving one third on £118 cost and £177 selling price', () => {
  assert.equal(Math.round(dealerQuoteEconomics(118, 177).margin), 33);
});