import { describe, expect, it, vi } from 'vitest';
import { assertCustomerPolicySaved, ensureDealerCustomerPortalPolicy, ensureSignedInCustomerPortalPolicies } from '../../../supabase/functions/_shared/customerPortalPolicy';

describe('customer-safe portal record creation', () => {
  it('does not report fulfilment success after a failed policy insert', () => {
    expect(() => assertCustomerPolicySaved({ message: 'write failed' })).toThrow();
    expect(() => assertCustomerPolicySaved(null)).not.toThrow();
  });
  it('requests creation by the sale ID only, never passing client prices or identity overrides', async () => {
    const admin = { rpc: vi.fn().mockResolvedValue({ data: 'portal-policy', error: null }) };
    expect(await ensureDealerCustomerPortalPolicy(admin, 'sale-one')).toBe('portal-policy');
    expect(admin.rpc).toHaveBeenCalledWith('ensure_dealer_customer_portal_policy', { p_customer_id: 'sale-one' });
  });
  it('surfaces a failed portal write instead of claiming the customer record is ready', async () => {
    const admin = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'write unavailable' } }) };
    await expect(ensureDealerCustomerPortalPolicy(admin, 'sale-one')).rejects.toThrow();
  });
  it('recovers every vehicle belonging to the authenticated email within the Panda dealer scope', async () => {
    const filters: unknown[][] = [];
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: 'portal-policy', error: null }),
      from: vi.fn(() => {
        const query = {
          select: () => query,
          eq: (field: string, value: string) => { filters.push(['eq', field, value]); return query; },
          not: (field: string, op: string, value: unknown) => { filters.push(['not', field, op, value]); return query; },
          ilike: (field: string, value: string) => { filters.push(['ilike', field, value]); return query; },
          or: () => query, order: () => query,
          range: () => Promise.resolve({ data: [{ id: 'sale-one' }, { id: 'sale-two' }], error: null }),
        };
        return query;
      }),
    };
    await ensureSignedInCustomerPortalPolicies(admin, '  Buyer_1@Example.test  ');
    expect(filters).toContainEqual(['eq', 'brand', 'pandaprotect']);
    expect(filters).toContainEqual(['not', 'dealer_id', 'is', null]);
    expect(filters).toContainEqual(['ilike', 'email', 'buyer\\_1@example.test']);
    expect(admin.rpc.mock.calls).toEqual([
      ['ensure_dealer_customer_portal_policy', { p_customer_id: 'sale-one' }],
      ['ensure_dealer_customer_portal_policy', { p_customer_id: 'sale-two' }],
    ]);
  });
});