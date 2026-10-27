import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
    if (!url || !key || !token) return new Response(JSON.stringify({ error: 'Sign in to view trade pricing.' }), { status: 401, headers });
    const db = createClient(url, key);
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: 'Sign in to view trade pricing.' }), { status: 401, headers });
    const { data: dealer } = await db.from('dealers').select('id').eq('user_id', user.id).maybeSingle();
    if (!dealer) return new Response(JSON.stringify({ error: 'A dealer account is required.' }), { status: 403, headers });
    const { data, error } = await db.from('dealer_admin_plans').select('id, pricing_matrix, coverage_details')
      .eq('is_active', true).contains('pricing_matrix', { brand: 'pandaprotect', version: 'annual-v1' }).single();
    if (error || !data) throw new Error('Warranty prices are unavailable. Please try again.');
    return new Response(JSON.stringify({ product_id: data.id, ...data.pricing_matrix, cover: data.coverage_details }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Pricing unavailable.' }), { status: 503, headers });
  }
});