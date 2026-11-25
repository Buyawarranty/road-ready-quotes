import { describe, expect, it } from 'vitest';
import { finaliseDealerCardPayment } from '../../../supabase/functions/_shared/dealerCardPayment';

const session = {
  id: 'cs_test_dealer_sale',
  payment_status: 'paid',
  currency: 'gbp',
  amount_total: 119,
  livemode: true,
  metadata: {
    source: 'dealer_journey',
    customer_id: 'customer-1',
    dealer_id: 'dealer-1',
    dealer_quote_id: 'quote-1',
  },
};

function mockAdmin(alreadyVerified = false, isTest = false, status = 'Active') {
  const calls = { rpc: [] as any[], emails: [] as any[], updates: [] as any[] };
  let mode = '';
  let table = '';
  const chain: any = {
    eq: () => chain,
    in: () => chain,
    select: () => chain,
    maybeSingle: async () => table === 'dealers' ? { data: { id: 'dealer-1', is_test: isTest }, error: null } : mode === 'update'
      ? { data: alreadyVerified ? null : { id: 'customer-1' }, error: null }
      : { data: { id: 'customer-1', status, dealer_id: 'dealer-1', final_amount: 1.19, stripe_session_id: session.id, payment_verified: alreadyVerified }, error: null },
  };
  const admin = {
    calls,
    from: (name: string) => { table = name; return ({
      select: () => { mode = 'customer'; return chain; },
      update: (payload: any) => { mode = 'update'; calls.updates.push(payload); return chain; },
    }); },
    rpc: async (name: string, args: any) => { calls.rpc.push({ name, args }); return { error: null }; },
    functions: { invoke: async (name: string, args: any) => { calls.emails.push({ name, args }); return { data: { success: true }, error: null }; } },
  };
  return admin;
}

describe('dealer card completion', () => {
  it.each([false, true])('never reactivates cancelled cover on a payment retry (verified=%s)', async verified => {
    const admin = mockAdmin(verified, false, 'Cancelled');
    await expect(finaliseDealerCardPayment(admin, session)).rejects.toThrow('no longer active');
    expect(admin.calls.updates).toHaveLength(0);
    expect(admin.calls.emails).toHaveLength(0);
    expect(admin.calls.rpc).toHaveLength(0);
  });
  it('tags completed test-card purchases Test and keeps the normal warranty fulfilment', async () => {
    const admin = mockAdmin(false, true);
    await finaliseDealerCardPayment(admin, { ...session, livemode: false });
    expect(admin.calls.updates[0]).toMatchObject({ is_test: true, payment_verification_source: 'stripe_test', status: 'Active' });
    expect(admin.calls.emails).toHaveLength(1);
  });
  it('cannot activate a live warranty with a test payment', async () => {
    const admin = mockAdmin();
    await expect(finaliseDealerCardPayment(admin, { ...session, livemode: false })).rejects.toThrow('Payment mode');
    expect(admin.calls.updates).toHaveLength(0);
  });
  it('updates payment, quote and warranty then sends purchase emails', async () => {
    const admin = mockAdmin();
    const result = await finaliseDealerCardPayment(admin, session as any);
    expect(result.confirmed).toBe(true);
    expect(admin.calls.updates[0]).toMatchObject({ payment_status: 'paid', payment_verified: true, status: 'Active' });
    expect(admin.calls.rpc).toContainEqual({
      name: 'complete_dealer_sale',
      args: { p_customer_id: 'customer-1', p_dealer_quote_id: 'quote-1', p_stripe_session_id: session.id, p_quote_status: 'paid' },
    });
    expect(admin.calls.emails).toEqual([{ name: 'dealer-warranty-email', args: { body: { customer_id: 'customer-1', kind: 'paid' } } }]);
  });

  it('rejects a payment amount that differs from the dealer sale', async () => {
    const admin = mockAdmin();
    await expect(finaliseDealerCardPayment(admin, { ...session, amount_total: 118 } as any)).rejects.toThrow('warranty amount');
    expect(admin.calls.updates).toHaveLength(0);
    expect(admin.calls.emails).toHaveLength(0);
  });

  it('keeps repeat confirmation idempotent without duplicating emails', async () => {
    const admin = mockAdmin(true);
    const result = await finaliseDealerCardPayment(admin, session as any);
    expect(result.alreadyConfirmed).toBe(true);
    expect(admin.calls.rpc.filter(call => call.name === 'complete_dealer_sale')).toHaveLength(1);
    expect(admin.calls.emails).toHaveLength(0);
  });
});
