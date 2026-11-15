import { it } from 'node:test';
import assert from 'node:assert/strict';
import { validateAnnualPlan } from '../../../supabase/functions/_shared/dealerAnnualValidation';
const plan = { duration_months: 24, dealer_price: 199, retail_price: 695, excess: 0, labour_rate: 100, claim_limit: 2000 };
const product = { months: 24, dealer_price: 199, min_price: 199, max_price: 1400, active: true };
const boost = { active: true, claim_limit: 5000, dealer_price: 60, retail_price: 60 };
const tiered = { active: true, claim_limit: 5000, dealer_price: 60, retail_price: 60, terms: [{ months: 12, dealer_price: 20, retail_price: 60 }, { months: 24, dealer_price: 40, retail_price: 100 }, { months: 36, dealer_price: 60, retail_price: 140 }] };
it('accepts the new £199 two-year cost and rejects the old £200 cost', () => {
  assert.equal(validateAnnualPlan(plan, product), null);
  assert.ok(validateAnnualPlan({ ...plan, dealer_price: 200 }, product));
});
it('accepts the new £99 one-year cost and rejects the old £100 cost', () => {
  const oneYear = { months: 12, dealer_price: 99, min_price: 99, max_price: null, active: true };
  assert.equal(validateAnnualPlan({ ...plan, duration_months: 12, dealer_price: 99 }, oneYear), null);
  assert.ok(validateAnnualPlan({ ...plan, duration_months: 12, dealer_price: 100 }, oneYear));
});
it('rejects inactive four-year charging', () => assert.ok(validateAnnualPlan({ ...plan, duration_months: 48 }, { ...product, months: 48, active: false })));
it('rejects changed dealer cost', () => assert.ok(validateAnnualPlan({ ...plan, dealer_price: 100 }, product)));
it('rejects retail outside admin bounds', () => assert.ok(validateAnnualPlan({ ...plan, retail_price: 1401 }, product)));
it('enforces £0 excess', () => assert.ok(validateAnnualPlan({ ...plan, excess: 50 }, product)));
it('enforces £100 labour', () => assert.ok(validateAnnualPlan({ ...plan, labour_rate: 70 }, product)));
it('enforces £2000 claim limit by default', () => assert.ok(validateAnnualPlan({ ...plan, claim_limit: 3000 }, product)));
it('accepts the plan claim limit from cover details (£3,000)', () => assert.equal(validateAnnualPlan({ ...plan, claim_limit: 3000 }, product, { claim: 3000 }), null));
it('boost adds £60 cost and raises the claim limit to £5,000', () => assert.equal(validateAnnualPlan({ ...plan, dealer_price: 259, retail_price: 755, claim_limit: 5000, boost: true }, product, { claim: 3000, boost }), null));
it('rejects boost charged at the base cost', () => assert.ok(validateAnnualPlan({ ...plan, dealer_price: 199, claim_limit: 5000, boost: true }, product, { claim: 3000, boost })));
it('rejects a £5,000 limit without the boost', () => assert.ok(validateAnnualPlan({ ...plan, claim_limit: 5000 }, product, { claim: 3000, boost })));
it('rejects boost when it is switched off in admin', () => assert.ok(validateAnnualPlan({ ...plan, dealer_price: 259, retail_price: 755, claim_limit: 5000, boost: true }, product, { claim: 3000, boost: { ...boost, active: false } })));
it('charges the two year boost at £40 cost and £100 retail', () => assert.equal(validateAnnualPlan({ ...plan, dealer_price: 239, retail_price: 795, claim_limit: 5000, boost: true }, product, { claim: 3000, boost: tiered }), null));
it('rejects a two year boost charged at the one year cost', () => assert.ok(validateAnnualPlan({ ...plan, dealer_price: 219, retail_price: 795, claim_limit: 5000, boost: true }, product, { claim: 3000, boost: tiered })));
it('accepts the new £299 three-year cost and charges its boost at £60', () => {
  const threeYear = { months: 36, dealer_price: 299, min_price: 299, max_price: null, active: true };
  assert.equal(validateAnnualPlan({ duration_months: 36, dealer_price: 359, retail_price: 1135, excess: 0, labour_rate: 100, claim_limit: 5000, boost: true }, threeYear, { claim: 3000, boost: tiered }), null);
  assert.ok(validateAnnualPlan({ duration_months: 36, dealer_price: 300, retail_price: 1135, excess: 0, labour_rate: 100, claim_limit: 3000 }, threeYear, { claim: 3000 }));
});
it('rejects a three year boost charged at the two year cost', () => assert.ok(validateAnnualPlan({ duration_months: 36, dealer_price: 339, retail_price: 1135, excess: 0, labour_rate: 100, claim_limit: 5000, boost: true }, { months: 36, dealer_price: 299, min_price: 299, max_price: null, active: true }, { claim: 3000, boost: tiered })));
it('accepts the new £399 four-year cost with the standard boost price', () => {
  const fourYear = { months: 48, dealer_price: 399, min_price: 399, max_price: null, active: true, approvals_complete: true };
  assert.equal(validateAnnualPlan({ duration_months: 48, dealer_price: 459, retail_price: 1455, excess: 0, labour_rate: 100, claim_limit: 5000, boost: true }, fourYear, { claim: 3000, boost: tiered }), null);
  assert.ok(validateAnnualPlan({ duration_months: 48, dealer_price: 400, retail_price: 1455, excess: 0, labour_rate: 100, claim_limit: 3000 }, fourYear, { claim: 3000 }));
});
