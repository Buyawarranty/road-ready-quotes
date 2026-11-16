import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('resend the missing paid dealer purchase confirmations', async () => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  assert(url && serviceKey, 'Protected function test credentials are required');
  const response = await fetch(`${url}/functions/v1/dealer-warranty-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({ customer_id: 'd5e97b8d-45ba-4e50-bee5-9ff5e54b7d31', kind: 'paid' }),
  });
  const result = await response.json();
  console.log('Purchase email result', response.status, result);
  assertEquals(response.status, 200);
  assertEquals(result.dealer_sent, true);
  assertEquals(result.customer_sent, true);
});
