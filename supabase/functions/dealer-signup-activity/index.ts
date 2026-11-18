import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const latest = (dates: Array<string | null | undefined>) => {
  const valid = dates.filter((value): value is string => Boolean(value && Number.isFinite(new Date(value).getTime())));
  if (!valid.length) return null;
  return valid.reduce((a, b) => new Date(a).getTime() >= new Date(b).getTime() ? a : b);
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !serviceKey) return json({ error: 'Dealer activity is unavailable.' }, 500);

  const authorization = req.headers.get('Authorization') || '';
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'Please sign in to the admin dashboard first.' }, 401);

  const body = await req.json().catch(() => ({}));
  const signupId = String(body.signup_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(signupId)) return json({ error: 'A valid signup is required.' }, 400);

  // This caller-scoped read applies the same signup RLS as the admin page.
  const { data: allowedSignup, error: accessError } = await caller
    .from('trade_warranty_signups')
    .select('id, dealer_id')
    .eq('id', signupId)
    .maybeSingle();
  if (accessError) return json({ error: 'Dealer access could not be checked.' }, 403);
  if (!allowedSignup) return json({ error: 'Signup not found or access denied.' }, 404);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const emptyActivity = {
    dealer_account_created: false,
    dealer_created_at: null,
    dealer_status: null,
    last_sign_in_at: null,
    quote_count: 0,
    warranty_count: 0,
    last_quote_at: null,
    last_warranty_at: null,
    last_activity_at: null,
  };
  if (!allowedSignup.dealer_id) return json({ success: true, activity: emptyActivity });

  const { data: dealer, error: dealerError } = await admin
    .from('dealers')
    .select('id, user_id, created_at, status')
    .eq('id', allowedSignup.dealer_id)
    .maybeSingle();
  if (dealerError) return json({ error: 'Dealer account could not be loaded.' }, 500);
  if (!dealer) return json({ success: true, activity: emptyActivity });

  const [authResult, quotesResult, warrantiesResult] = await Promise.all([
    dealer.user_id ? admin.auth.admin.getUserById(dealer.user_id) : Promise.resolve({ data: { user: null }, error: null }),
    admin.from('dealer_quotes').select('updated_at', { count: 'exact' }).eq('dealer_id', dealer.id).or('is_test.is.null,is_test.eq.false').order('updated_at', { ascending: false }).limit(1),
    admin.from('dealer_warranties').select('updated_at', { count: 'exact' }).eq('dealer_id', dealer.id).or('is_test.is.null,is_test.eq.false').order('updated_at', { ascending: false }).limit(1),
  ]);
  if (quotesResult.error || warrantiesResult.error) return json({ error: 'Dealer portal usage could not be loaded.' }, 500);
  if (authResult.error) {
    console.error('dealer-signup-activity auth lookup failed', authResult.error);
    return json({ error: 'Dealer sign-in activity could not be loaded.' }, 500);
  }

  const lastSignIn = authResult.data.user?.last_sign_in_at || null;
  const lastQuote = quotesResult.data?.[0]?.updated_at || null;
  const lastWarranty = warrantiesResult.data?.[0]?.updated_at || null;
  return json({
    success: true,
    activity: {
      dealer_account_created: true,
      dealer_created_at: dealer.created_at,
      dealer_status: dealer.status,
      last_sign_in_at: lastSignIn,
      quote_count: quotesResult.count || 0,
      warranty_count: warrantiesResult.count || 0,
      last_quote_at: lastQuote,
      last_warranty_at: lastWarranty,
      last_activity_at: latest([lastSignIn, lastQuote, lastWarranty]),
    },
  });
});
