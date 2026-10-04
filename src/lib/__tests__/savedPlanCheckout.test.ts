import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSavedPlanQuote } from '../savedPlanCheckout';

const base = { name: 'Std', term_months: 12, excess: 50, labour: 70, parts: 'age-mileage', claim_limit: 1000, price: null };

describe('Saved plan checkout', () => {
  it('charges a comprehensive saved plan as full price plus VAT once', () => {
    const q = buildSavedPlanQuote({ ...base, plan_type: 'gold' });
    assert.deepEqual(q.totals, { net: 118, vat: 23.6, total: 141.6 });
    assert.equal(q.plan.dealer_price, 141.6);
  });
  it('charges Manage My Claims at £1 a month', () => {
    const q = buildSavedPlanQuote({ ...base, plan_type: 'basic' });
    assert.equal(q.plan.dealer_price, 1);
  });
  it('rejects a saved plan using the unapproved £5,000 claim limit', () => {
    assert.throws(() => buildSavedPlanQuote({ ...base, plan_type: 'gold', claim_limit: 5000 }));
  });
});
