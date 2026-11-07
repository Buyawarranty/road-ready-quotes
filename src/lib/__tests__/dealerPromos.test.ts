import { it } from 'node:test';
import assert from 'node:assert/strict';
import { canManageDealerPromos } from '../dealerPromoAccess';
import { calculateDealerPromo } from '../../../supabase/functions/_shared/dealerPromoValidation';

const promo = { code: 'PANDA10', discount_type: 'percent', discount_value: 10, min_order_amount: 0, is_active: true, times_used: 0 };
it('only Admin and Super Admin manage dealer codes', () => {
  assert.equal(canManageDealerPromos('admin'), true);
  assert.equal(canManageDealerPromos('super_admin'), true);
  for (const role of ['manager', 'bdm', 'sales', 'accounts', 'dev_tester', 'trader', null]) assert.equal(canManageDealerPromos(role), false);
});
it('applies 10% to £300 dealer cost, not customer retail', () => assert.deepEqual(calculateDealerPromo(300, promo), { code: 'PANDA10', discount_amount: 30, total: 270 }));
it('fixed discounts require £350 minimum spend', () => assert.throws(() => calculateDealerPromo(349.99, { ...promo, discount_type: 'fixed', discount_value: 25 }), /£350/));
it('fixed £25 discount on £350 yields £325', () => assert.equal(calculateDealerPromo(350, { ...promo, discount_type: 'fixed', discount_value: 25 }).total, 325));
it('supports a higher configured minimum spend', () => assert.throws(() => calculateDealerPromo(400, { ...promo, min_order_amount: 500 }), /£500/));
it('rejects inactive codes', () => assert.throws(() => calculateDealerPromo(300, { ...promo, is_active: false })));
it('rejects exhausted codes', () => assert.throws(() => calculateDealerPromo(300, { ...promo, usage_limit: 1, times_used: 1 })));
it('rejects a future start', () => assert.throws(() => calculateDealerPromo(300, { ...promo, valid_from: '2026-11-08T00:00:00Z' }, Date.parse('2026-11-07T00:00:00Z'))));
it('rejects at expiry', () => assert.throws(() => calculateDealerPromo(300, { ...promo, valid_until: '2026-11-07T00:00:00Z' }, Date.parse('2026-11-07T00:00:00Z'))));
it('enforces £50 minimum payable', () => assert.throws(() => calculateDealerPromo(50, promo)));
it('enforces 50% floor', () => assert.throws(() => calculateDealerPromo(300, { ...promo, discount_value: 51 })));
it('rounds in pence', () => assert.equal(calculateDealerPromo(120.99, promo).total, 108.89));