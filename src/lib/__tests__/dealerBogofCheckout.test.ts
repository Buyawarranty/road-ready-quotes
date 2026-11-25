import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { normalizeCheckoutEmail, normalizeCheckoutPlate, dealerCheckoutReuseError, dealerFreeCheckoutReuseError } from '../../../supabase/functions/_shared/dealerCheckoutDuplicate';
import { waitForDealerFreeNotification } from '../../../supabase/functions/_shared/dealerFreeNotification';
import { dealerQuoteCheckoutError } from '../../../supabase/functions/_shared/dealerQuoteStatus';
import { dealerCheckoutState } from '../../../supabase/functions/_shared/dealerCheckoutState';

function checkout(input: { remaining?: number; issueError?: { message: string; code?: string }; existing?: object; emailSent?: boolean; priorSession?: 'open' | 'expired' | 'complete' | 'unknown'; expireResult?: string; isTest?: boolean } = {}) {
  const mutations = vi.fn();
  const stripeSecret = vi.fn(() => {
    if (input.priorSession) return 'isolated-previous-card-key';
    throw new Error('A free warranty must not request a Stripe key');
  });
  const stripeCreated = vi.fn();
  const retrieve = vi.fn(async () => ({ id: 'cs_previous', status: input.priorSession }));
  const expire = vi.fn(async () => ({ id: 'cs_previous', status: input.expireResult ?? 'expired' }));
  const notify = vi.fn(async () => ({ sent: input.emailSent !== false }));
  const query = (data: unknown) => {
    const q: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'limit', 'order', 'ilike', 'in', 'or']) q[method] = () => q;
    for (const method of ['insert', 'update', 'delete']) q[method] = mutations;
    q.single = q.maybeSingle = async () => ({ data, error: null });
    q.then = (resolve: (result: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve);
    return q;
  };
  const rpc = vi.fn(async (name: string) => {
    if (name === 'dealer_bogof_remaining') return { data: input.remaining ?? 1, error: null };
    if (name === 'issue_dealer_intro_free') return { data: input.issueError ? null : { customer_id: 'free-customer', slot: 1, total: 0 }, error: input.issueError ?? null };
    throw new Error(`Unexpected RPC ${name}`);
  });
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'dealer-user' } }, error: null }) },
    from: (name: string) => {
      if (name === 'dealers') return query({ id: 'dealer', user_id: 'dealer-user', status: 'active', is_test: input.isTest === true });
      if (name === 'dealer_quotes') return query({ status: 'draft', paid_at: null });
      if (name === 'dealer_trade_terms_versions') return query(null);
      if (name === 'dealer_trade_terms_acceptances') return query({ dealer_id: 'dealer' });
      if (name === 'customers') return query(input.existing ? [input.existing] : []);
      throw new Error(`Unexpected table ${name}`);
    }, rpc,
  };
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const Deno = { env: { get: () => 'isolated-configuration' }, serve: (h: typeof handler) => { handler = h; } };
  const source = readFileSync(new URL('../../../supabase/functions/dealer-create-checkout/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  new Function('Deno', 'createClient', 'Stripe', 'corsHeaders', 'dealerStripeSecret', 'dealerQuoteCheckoutError', 'dealerCheckoutState', 'normalizeCheckoutEmail', 'normalizeCheckoutPlate', 'dealerCheckoutReuseError', 'displayWarrantyPlanName', 'notifyDealerSale', 'dealerFreeCheckoutReuseError', 'waitForDealerFreeNotification', js)(
    Deno, () => client, class { checkout = { sessions: { retrieve, expire } }; constructor() { stripeCreated(); } }, {}, stripeSecret, dealerQuoteCheckoutError, dealerCheckoutState,
    normalizeCheckoutEmail, normalizeCheckoutPlate, dealerCheckoutReuseError, () => 'Platinum', notify, dealerFreeCheckoutReuseError, waitForDealerFreeNotification,
  );
  if (!handler) throw new Error('Checkout handler not registered');
  const request = async (extra: object = {}) => handler?.(new Request('https://pandaprotect.co.uk/checkout', {
    method: 'POST', headers: { Authorization: 'Bearer isolated', 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealer_id: 'dealer', quote_id: 'draft-quote', payment_method: 'pay_now', expected_free: true,
      vehicle: { reg: 'BGF 100A' }, customer: { name: 'Test Buyer', email: 'buyer@example.test', postcode: 'SW1A 1AA' },
      plan: { plan_type: 'gold', duration_months: 12, dealer_price: 99, retail_price: 599 }, ...extra }),
  }));
  return { request, rpc, notify, stripeCreated, stripeSecret, mutations, retrieve, expire };
}

describe('earned free warranty checkout', () => {
  it('activates at £0 through one atomic issuance, without Stripe or separate customer writes', async () => {
    const t = checkout();
    const result = await t.request();
    expect(result?.status).toBe(200);
    expect(await result?.json()).toMatchObject({ method: 'intro_free', total: 0, customer_id: 'free-customer', intro_free_slot: 1 });
    expect(t.rpc).toHaveBeenCalledWith('issue_dealer_intro_free', expect.objectContaining({ p_dealer_quote_id: 'draft-quote', p_original_amount: 99,
      p_customer: expect.objectContaining({ final_amount: 0, discount_code: 'BOGOF FREE', payment_status: 'pending', payment_verified: false }) }));
    expect(t.notify).toHaveBeenCalledWith(expect.anything(), 'free-customer', 'paid');
    expect(t.stripeCreated).not.toHaveBeenCalled();
    expect(t.stripeSecret).not.toHaveBeenCalled();
    expect(t.mutations).not.toHaveBeenCalled();
  });
  it('keeps a stale £0 preview from starting a paid checkout', async () => {
    const t = checkout({ remaining: 0 });
    const result = await t.request();
    expect(result?.status).toBe(409);
    expect(await result?.json()).toMatchObject({ code: 'FREE_OFFER_CHANGED' });
    expect(t.rpc).toHaveBeenCalledTimes(1);
    expect(t.stripeSecret).not.toHaveBeenCalled();
    expect(t.notify).not.toHaveBeenCalled();
  });
  it('surfaces an issuance failure without sending email or consuming a separate slot', async () => {
    const t = checkout({ issueError: { message: 'Storage failure', code: 'XX000' } });
    const result = await t.request();
    expect(result?.status).toBe(500);
    expect(await result?.json()).toMatchObject({ code: 'FREE_ISSUE_FAILED' });
    expect(t.notify).not.toHaveBeenCalled();
    expect(t.mutations).not.toHaveBeenCalled();
  });
  it('handles a concurrently consumed entitlement without silently taking payment', async () => {
    const t = checkout({ issueError: { message: 'No free warranty available' } });
    const result = await t.request();
    expect(result?.status).toBe(409);
    expect(await result?.json()).toMatchObject({ code: 'FREE_OFFER_CHANGED' });
    expect(t.stripeCreated).not.toHaveBeenCalled();
  });
  it('keeps a paid customer and warranty untouched', async () => {
    const t = checkout({ existing: { id: 'settled', email: 'buyer@example.test', registration_plate: 'BGF100A', dealer_id: 'dealer', brand: 'pandaprotect', purchase_source: 'dealer', payment_status: 'paid', payment_verified: true } });
    const result = await t.request();
    expect(result?.status).toBe(409);
    expect(t.rpc).not.toHaveBeenCalledWith('issue_dealer_intro_free', expect.anything());
    expect(t.mutations).not.toHaveBeenCalled();
  });
  it('reports delayed email honestly while keeping the issued free warranty successful', async () => {
    const t = checkout({ emailSent: false });
    const result = await t.request();
    expect(result?.status).toBe(200);
    expect(await result?.json()).toMatchObject({ total: 0, email: { sent: false } });
  });
  it('an explicit free method returns £0 without card configuration or an invoice', async () => {
    const t = checkout();
    const result = await t.request({ payment_method: 'intro_free' });
    expect(result?.status).toBe(200);
    expect(await result?.json()).toMatchObject({ method: 'intro_free', total: 0 });
    expect(t.stripeSecret).not.toHaveBeenCalled();
    expect(t.stripeCreated).not.toHaveBeenCalled();
    expect(t.rpc.mock.calls.map(call => call[0])).toEqual(['dealer_bogof_remaining', 'issue_dealer_intro_free']);
  });
  it('the free method cannot become a paid checkout when the offer is unavailable', async () => {
    const t = checkout({ remaining: 0 });
    const result = await t.request({ payment_method: 'intro_free', expected_free: undefined });
    expect(result?.status).toBe(409);
    expect(t.stripeSecret).not.toHaveBeenCalled();
    expect(t.stripeCreated).not.toHaveBeenCalled();
    expect(t.mutations).not.toHaveBeenCalled();
  });
  it('reuses an earlier owned pending customer atomically without Stripe or destructive separate writes', async () => {
    const existing = { id: 'pending', email: 'buyer@example.test', registration_plate: 'BGF100A', dealer_id: 'dealer', brand: 'pandaprotect', purchase_source: 'dealer', payment_status: 'pending', payment_verified: false, stripe_session_id: null };
    const t = checkout({ existing });
    const result = await t.request({ payment_method: 'intro_free' });
    expect(result?.status).toBe(200);
    expect(t.rpc).toHaveBeenCalledWith('issue_dealer_intro_free', expect.objectContaining({ p_customer: expect.objectContaining({ _reuse_customer_id: 'pending', _expired_stripe_session_id: null, final_amount: 0 }) }));
    expect(t.mutations).not.toHaveBeenCalled();
    expect(t.stripeSecret).not.toHaveBeenCalled();
    expect(t.stripeCreated).not.toHaveBeenCalled();
  });
  it('failure with an earlier pending customer makes no separate changes to that customer', async () => {
    const existing = { id: 'pending', email: 'buyer@example.test', registration_plate: 'BGF100A', dealer_id: 'dealer', brand: 'pandaprotect', purchase_source: 'dealer', payment_status: 'pending', payment_verified: false, stripe_session_id: null };
    const t = checkout({ existing, issueError: { message: 'Storage failure' } });
    const result = await t.request({ payment_method: 'intro_free' });
    expect(result?.status).toBe(500);
    expect(t.mutations).not.toHaveBeenCalled();
    expect(t.notify).not.toHaveBeenCalled();
  });
  it('test dealers also activate free cover without a test Stripe key', async () => {
    const t = checkout({ isTest: true });
    expect((await t.request({ payment_method: 'intro_free' }))?.status).toBe(200);
    expect(t.stripeSecret).not.toHaveBeenCalled();
    expect(t.stripeCreated).not.toHaveBeenCalled();
  });
  it('safely closes an earlier open card session without creating or charging another one', async () => {
    const existing = { id: 'pending', email: 'buyer@example.test', registration_plate: 'BGF100A', dealer_id: 'dealer', brand: 'pandaprotect', purchase_source: 'dealer', payment_status: 'pending', payment_verified: false, stripe_session_id: 'cs_previous' };
    const t = checkout({ existing, priorSession: 'open' });
    expect((await t.request({ payment_method: 'intro_free' }))?.status).toBe(200);
    expect(t.retrieve).toHaveBeenCalledWith('cs_previous');
    expect(t.expire).toHaveBeenCalledWith('cs_previous');
    expect(t.rpc).toHaveBeenCalledWith('issue_dealer_intro_free', expect.objectContaining({ p_customer: expect.objectContaining({ _reuse_customer_id: 'pending', _expired_stripe_session_id: 'cs_previous', final_amount: 0 }) }));
    expect(t.mutations).not.toHaveBeenCalled();
  });
  it.each(['complete', 'unknown'] as const)('preserves an earlier %s card checkout without free issuance', async priorSession => {
    const existing = { id: 'pending', email: 'buyer@example.test', registration_plate: 'BGF100A', dealer_id: 'dealer', brand: 'pandaprotect', purchase_source: 'dealer', payment_status: 'pending', payment_verified: false, stripe_session_id: 'cs_previous' };
    const t = checkout({ existing, priorSession });
    expect((await t.request({ payment_method: 'intro_free' }))?.status).toBe(409);
    expect(t.rpc).not.toHaveBeenCalledWith('issue_dealer_intro_free', expect.anything());
    expect(t.mutations).not.toHaveBeenCalled();
    expect(t.expire).not.toHaveBeenCalled();
    expect(t.notify).not.toHaveBeenCalled();
  });
  it('does not reuse an earlier session if closing it did not confirm expiration', async () => {
    const existing = { id: 'pending', email: 'buyer@example.test', registration_plate: 'BGF100A', dealer_id: 'dealer', brand: 'pandaprotect', purchase_source: 'dealer', payment_status: 'pending', payment_verified: false, stripe_session_id: 'cs_previous' };
    const t = checkout({ existing, priorSession: 'open', expireResult: 'open' });
    expect((await t.request({ payment_method: 'intro_free' }))?.status).toBe(409);
    expect(t.rpc).not.toHaveBeenCalledWith('issue_dealer_intro_free', expect.anything());
    expect(t.mutations).not.toHaveBeenCalled();
  });
});