import { describe, expect, it, vi } from 'vitest';
import { customerPortalPaymentAmount, loadCustomerPortalPolicies } from '../customerPortalPolicies';

function lookupClient(responses: Array<{ data: unknown[] | null; error: unknown }>) {
  const filters: Array<[string, string, unknown]> = [];
  let index = 0;
  const client = { from: vi.fn(() => {
    const result = responses[index++];
    const query = {
      select: () => query,
      ilike: (field: string, value: string) => { filters.push(['ilike', field, value]); return query; },
      eq: (field: string, value: string) => { filters.push(['eq', field, value]); return query; },
      or: (value: string) => { filters.push(['or', '', value]); return query; },
      order: () => query,
      abortSignal: () => Promise.resolve(result),
    };
    return query;
  }) };
  return { client: client as unknown as Parameters<typeof loadCustomerPortalPolicies>[0], filters };
}

describe('customer portal warranty lookup', () => {
  it('never shows dealer charges or an amount before purchaser ownership is resolved', () => {
    expect(customerPortalPaymentAmount({ payment_amount: 99, customers: { dealer_id: 'dealer-one' } })).toBeNull();
    expect(customerPortalPaymentAmount({ payment_amount: 99 })).toBeNull();
    expect(customerPortalPaymentAmount({ payment_amount: 599, customers: { dealer_id: null } })).toBe(599);
  });
  it('combines email and login ownership so separate vehicles are retained', async () => {
    const { client } = lookupClient([
      { data: [{ id: 'vehicle-one' }], error: null },
      { data: [{ id: 'vehicle-one' }, { id: 'vehicle-two' }], error: null },
    ]);
    expect((await loadCustomerPortalPolicies(client, { email: 'customer@example.test', userId: 'login-one' })).map(p => p.id))
      .toEqual(['vehicle-one', 'vehicle-two']);
  });
  it('matches the normalized whole email, including literal underscores and percent signs', async () => {
    const { client, filters } = lookupClient([{ data: [], error: null }]);
    await loadCustomerPortalPolicies(client, { email: '  Buyer_100%@Example.test  ' });
    expect(filters).toContainEqual(['ilike', 'email', 'buyer\\_100\\%@example.test']);
  });
  it('does not report an empty account when a lookup fails', async () => {
    const { client } = lookupClient([{ data: null, error: { message: 'read unavailable' } }, { data: [], error: null }]);
    await expect(loadCustomerPortalPolicies(client, { email: 'buyer@example.test', userId: 'login-one' })).rejects.toThrow();
  });
  it('excludes soft-deleted records for ordinary customers', async () => {
    const { client, filters } = lookupClient([{ data: [], error: null }]);
    await loadCustomerPortalPolicies(client, { email: 'buyer@example.test' });
    expect(filters).toContainEqual(['or', '', 'is_deleted.is.null,is_deleted.eq.false']);
  });
  it('view-as uses only the target customer, never the staff login ID', async () => {
    const { client, filters } = lookupClient([{ data: [], error: null }, { data: [{ id: 'target-warranty' }], error: null }]);
    expect((await loadCustomerPortalPolicies(client, {
      email: 'target@example.test', userId: 'staff-login', customerId: 'target-customer', impersonating: true,
    })).map(p => p.id)).toEqual(['target-warranty']);
    expect(filters).toContainEqual(['eq', 'customer_id', 'target-customer']);
    expect(filters.some(([, field]) => field === 'user_id')).toBe(false);
  });
  it('does not request policies without a signed-in or view-as identity', async () => {
    const { client } = lookupClient([]);
    expect(await loadCustomerPortalPolicies(client, {})).toEqual([]);
    expect(client.from).not.toHaveBeenCalled();
  });
});