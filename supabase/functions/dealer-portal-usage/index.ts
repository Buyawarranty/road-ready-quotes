import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const latest = (dates: Array<string | null | undefined>) =>
  dates.filter((v): v is string => !!v && Number.isFinite(new Date(v).getTime()))
    .reduce<string | null>((a, b) => (!a || new Date(b) > new Date(a) ? b : a), null);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: 'Please sign in first.' }, 401);

  const body = await req.json().catch(() => ({}));
  const requested = [...new Set((Array.isArray(body.dealer_ids) ? body.dealer_ids : []).map(String))]
    .filter(id => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 500);
  if (!requested.length) return json({ success: true, usage: [] });

  // Only dealers the caller can already see (via their own signup or portfolio RLS) are returned.
  const [sig, port] = await Promise.all([
    caller.from('trade_warranty_signups').select('dealer_id').in('dealer_id', requested),
    caller.from('bdm_portfolio').select('dealer_id').in('dealer_id', requested),
  ]);
  const allowed = [...new Set([...(sig.data || []), ...(port.data || [])].map((r: any) => r.dealer_id).filter(Boolean))] as string[];
  if (!allowed.length) return json({ success: true, usage: [] });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [dealersRes, quotesRes, warrRes] = await Promise.all([
    admin.from('dealers').select('id, user_id').in('id', allowed),
    admin.from('dealer_quotes').select('dealer_id, updated_at').in('dealer_id', allowed).or('is_test.is.null,is_test.eq.false').limit(20000),
    admin.from('dealer_warranties').select('dealer_id, updated_at').in('dealer_id', allowed).or('is_test.is.null,is_test.eq.false').limit(20000),
  ]);
  if (dealersRes.error || quotesRes.error || warrRes.error) return json({ error: 'Portal usage could not be loaded.' }, 500);

  const agg = (rows: any[]) => {
    const m = new Map<string, { n: number; last: string | null }>();
    for (const r of rows) { const c = m.get(r.dealer_id) || { n: 0, last: null }; c.n++; c.last = latest([c.last, r.updated_at]); m.set(r.dealer_id, c); }
    return m;
  };
  const q = agg(quotesRes.data || []), w = agg(warrRes.data || []);
  const usage = [];
  const dealers = dealersRes.data || [];
  for (let i = 0; i < dealers.length; i += 20) {
    const chunk = await Promise.all(dealers.slice(i, i + 20).map(async d => {
      let signIn: string | null = null;
      if (d.user_id) { const r = await admin.auth.admin.getUserById(d.user_id); signIn = r.data.user?.last_sign_in_at || null; }
      const qq = q.get(d.id), ww = w.get(d.id);
      return { dealer_id: d.id, last_sign_in_at: signIn, quote_count: qq?.n || 0, warranty_count: ww?.n || 0,
        last_activity_at: latest([signIn, qq?.last, ww?.last]) };
    }));
    usage.push(...chunk);
  }
  return json({ success: true, usage });
});
