import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Supabase Edge Function: callrail-sync-numbers
// Syncs tracking numbers from CallRail API and upserts them into callrail_tracking_numbers.

interface CallRailNumber {
  id: string;
  name: string;
  number: string;
  status: string;
  url: string;
}

interface CallRailNumbersResponse {
  tracking_numbers: CallRailNumber[];
  total_results?: number;
  page?: number;
  per_page?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(req.headers.get('Authorization')?.split(' ')[1] || '');
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is an admin/sales manager
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    const allowed = ['super_admin', 'admin', 'sales_manager', 'performance_manager'];
    if (!adminUser || !allowed.includes(adminUser.role || '')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('CALLRAIL_API_KEY');
    const accountId = Deno.env.get('CALLRAIL_ACCOUNT_ID');
    if (!apiKey || !accountId) {
      return new Response(JSON.stringify({ error: 'CallRail API key or account ID not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`https://api.callrail.com/v3/a/${accountId}/tracking_numbers.json`, {
      headers: {
        Authorization: `Token token=${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('CallRail API error:', response.status, text);
      return new Response(JSON.stringify({ error: `CallRail API error: ${response.status}`, detail: text }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data: CallRailNumbersResponse = await response.json();
    const numbers = data.tracking_numbers || [];

    const upsertRows = numbers.map((n) => ({
      callrail_tracker_id: n.id,
      label: n.name || null,
      phone_e164: n.number || null,
      active: (n.status || '').toLowerCase() !== 'disabled',
      raw: n as unknown,
    }));

    const { error: upsertError } = await supabase
      .from('callrail_tracking_numbers')
      .upsert(upsertRows, { onConflict: 'callrail_tracker_id' });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, count: upsertRows.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unhandled callrail-sync-numbers error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
