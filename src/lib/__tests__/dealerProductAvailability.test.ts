import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPREHENSIVE_QUOTE_URL, isPlanQuotable, quoteUrlForPlan } from '../dealerProductAvailability';

describe('dealer product availability while Manage My Claim is paused', () => {
  it('sends every quote straight to comprehensive warranty', () => {
    assert.equal(quoteUrlForPlan('fully-covered'), COMPREHENSIVE_QUOTE_URL);
    assert.equal(quoteUrlForPlan('dealer-paid'), COMPREHENSIVE_QUOTE_URL);
    assert.equal(quoteUrlForPlan(null), COMPREHENSIVE_QUOTE_URL);
  });

  it('hides saved Manage My Claim plans from quoting', () => {
    assert.equal(isPlanQuotable('basic'), false);
    assert.equal(isPlanQuotable('dealer-paid'), false);
    assert.equal(isPlanQuotable('gold'), true);
    assert.equal(isPlanQuotable('fully-covered'), true);
    assert.equal(isPlanQuotable(undefined), true);
  });
});
