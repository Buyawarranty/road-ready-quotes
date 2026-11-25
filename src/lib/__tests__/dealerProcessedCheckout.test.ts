import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { dealerQuoteCheckoutError } from '../../../supabase/functions/_shared/dealerQuoteStatus';

// Execute the real edge handlers with isolated clients: no passwords, live records or Stripe calls.
function handlerFor(file: string, quote: { status: string; paid_at: string | null }) {
  const writes = vi.fn();
  const stripeCreated = vi.fn();
  const query = (data: unknown) => {
    const q: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'limit', 'order']) q[method] = () => q;
    q.maybeSingle = q.single = async () => ({ data, error: null });
    return q;
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'caller' } }, error: null }) },
    from: (table: string) => {
      if (table === 'dealers') return query({ id: 'dealer-one', user_id: 'caller', status: 'active' });
      if (table === 'dealer_quotes') return query({ id: 'quote-one', warranty_duration: '12', ...quote });
      writes(table);
      throw new Error(`Unexpected sale operation: ${table}`);
    },
    rpc: writes,
  };
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const deno = { env: { get: () => 'isolated-test-config' }, serve: (h: typeof handler) => { handler = h; } };
  class StripeStub { constructor() { stripeCreated(); } }
  const source = readFileSync(new URL(`../../../supabase/functions/${file}/index.ts`, import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const importedCors = file === 'dealer-create-checkout' ? 'const corsHeaders = testCorsHeaders;\n' : '';
  new Function('Deno', 'createClient', 'Stripe', 'dealerQuoteCheckoutError', 'testCorsHeaders', importedCors + javascript)(deno, () => client, StripeStub, dealerQuoteCheckoutError, {});
  if (!handler) throw new Error('Handler was not registered');
  return { handler, writes, stripeCreated };
}

describe('processed dealer quotes are blocked before any new sale or card checkout', () => {
  it.each(['dealer-create-checkout', 'customer-create-checkout', 'dealer-quote-email'])('%s leaves a processed sale untouched', async file => {
    const { handler, writes, stripeCreated } = handlerFor(file, { status: 'paid', paid_at: '2026-11-24T15:56:51.952564Z' });
    const response = await handler(new Request('https://pandaprotect.co.uk/check', {
      method: 'POST', headers: { Authorization: 'Bearer isolated-test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote_id: 'quote-one', dealer_id: 'dealer-one', payment_method: 'pay_now',
        vehicle: { reg: 'FP14UBL' }, customer: { email: 'buyer@example.test' }, plan: { plan_type: 'gold' }, email: 'buyer@example.test' }),
    }));
    expect(response.status).toBe(409);
    expect(writes).not.toHaveBeenCalled();
    expect(stripeCreated).not.toHaveBeenCalled();
  });
  it('also blocks a paid quote historically labelled draft before creating another card session', async () => {
    const { handler, writes, stripeCreated } = handlerFor('customer-create-checkout', { status: 'draft', paid_at: '2026-11-24T15:56:51Z' });
    const response = await handler(new Request('https://pandaprotect.co.uk/check', { method: 'POST', body: JSON.stringify({ quote_id: 'quote-one' }) }));
    expect(response.status).toBe(409);
    expect(writes).not.toHaveBeenCalled();
    expect(stripeCreated).not.toHaveBeenCalled();
  });
});