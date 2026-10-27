import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dealerQuickWarrantyTerms } from '../dealerQuickWarrantyTerms';

describe('Quick warranty annual choices', () => {
  it('offers one, two, three and four years in order', () => {
    assert.deepEqual(dealerQuickWarrantyTerms.map(term => term.months), [12, 24, 36, 48]);
  });
  it('keeps four-year cover unavailable until pricing is approved', () => {
    assert.equal(dealerQuickWarrantyTerms.find(term => term.months === 48)?.disabled, true);
    assert.deepEqual(dealerQuickWarrantyTerms.filter(term => !term.disabled).map(term => term.months), [12, 24, 36]);
  });
});