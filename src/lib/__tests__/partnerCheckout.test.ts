import { describe, expect, it } from 'vitest';
import { canManagePartners, partnerCheckoutUrl, partnerTotal } from '../partnerCheckout';

describe('partner sales', () => {
  it('charges the standard retail price, plus the boost only when chosen', () => {
    const term = { months: 12, price: 599, boost_price: 120 };
    expect(partnerTotal(term, false)).toBe(599);
    expect(partnerTotal(term, true)).toBe(719);
  });
  it('only Admin and Super Admin manage partners', () => {
    expect(canManagePartners('admin')).toBe(true);
    expect(canManagePartners('super_admin')).toBe(true);
    expect(canManagePartners('bdm')).toBe(false);
    expect(canManagePartners('accounts')).toBe(false);
  });
  it('partner links carry no price, only partner, dealer and reg', () => {
    const url = partnerCheckoutUrl('acme-crm', 'd1', 'ab12 cde');
    expect(url).toBe('https://pandaprotect.co.uk/partner/checkout?p=acme-crm&d=d1&reg=AB12CDE');
  });
});
