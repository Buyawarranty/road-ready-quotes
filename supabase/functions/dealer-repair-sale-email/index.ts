import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  const body = await req.json().catch(() => ({}));
  if (body.repair_key !== 'repair-d5e97b8d-20261116') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.functions.invoke('dealer-warranty-email', {
    body: { customer_id: 'd5e97b8d-45ba-4e50-bee5-9ff5e54b7d31', kind: 'paid' },
  });
  return new Response(JSON.stringify({ data, error: error?.message || null }), { status: error ? 500 : 200, headers: { 'Content-Type': 'application/json' } });
});
