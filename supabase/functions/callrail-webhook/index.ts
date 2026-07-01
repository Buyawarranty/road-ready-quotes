import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Supabase Edge Function: callrail-webhook
// Public endpoint (verify_jwt = false). CallRail webhooks are authenticated via HMAC.
// Supported events: pre_call, post_call, call_modified.

const STATUS_FINISHED = 'completed';
const STATUS_MISSED = 'missed';
const STATUS_VOICEMAIL = 'voicemail';
const STATUS_RINGING = 'ringing';
const STATUS_IN_PROGRESS = 'in_progress';

interface CallRailWebhookBody {
  event?: string;
  id?: string;
  answered?: boolean;
  start_time?: string;
  end_time?: string;
  duration?: number;
  recording?: string;
  customer_name?: string;
  customer_phone_number?: string;
  customer_city?: string;
  customer_state?: string;
  tracking_phone_number?: string;
  tracking_number_id?: string;
  tracking_number?: string; // sometimes used instead of tracking_number_id
  direction?: string;
  source?: string;
  voicemail?: boolean;
  raw?: unknown;
}

function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 0) return null;
  if (digits.startsWith('07') && digits.length === 11) return '+44' + digits.slice(1);
  if (digits.startsWith('0') && digits.length === 11) return '+44' + digits.slice(1);
  if (digits.startsWith('44') && digits.length === 12) return '+' + digits;
  return '+' + digits;
}

async function verifySignature(req: Request, secret: string): Promise<boolean> {
  const signature = req.headers.get('CallRail-Signature') || req.headers.get('X-CallRail-Signature');
  if (!signature) return false;
  const body = await req.clone().text();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signed)));
  return signature === computed;
}

function parseStatus(body: CallRailWebhookBody): string {
  // pre_call -> ringing
  const event = (body.event || '').toLowerCase();
  if (event === 'pre_call') return STATUS_RINGING;
  if (event === 'post_call') {
    if (body.voicemail) return STATUS_VOICEMAIL;
    if (body.answered === false || body.duration === 0) return STATUS_MISSED;
    return STATUS_FINISHED;
  }
  if (event === 'call_modified') {
    // Re-derive from body if possible; otherwise treat as unchanged
    if (body.voicemail) return STATUS_VOICEMAIL;
    if (body.answered === false || body.duration === 0) return STATUS_MISSED;
    if (body.answered === true) return STATUS_FINISHED;
  }
  return STATUS_RINGING;
}

function toDateTimeOrNull(value: string | undefined | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const healthCheck = url.searchParams.get('health') === '1';
  if (healthCheck) {
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const secret = Deno.env.get('CALLRAIL_WEBHOOK_SECRET');
  if (!secret) {
    console.error('CALLRAIL_WEBHOOK_SECRET not configured');
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!await verifySignature(req, secret)) {
    console.error('Invalid CallRail signature');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const body: CallRailWebhookBody = await req.json();
    const event = (body.event || '').toLowerCase();
    const callrailCallId = body.id;
    if (!callrailCallId) {
      return new Response(JSON.stringify({ error: 'Missing call id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trackerId = body.tracking_number_id || body.tracking_number || null;
    const trackedNumber = body.tracking_phone_number || null;
    const callerNumber = normalizePhoneNumber(body.customer_phone_number);
    const status = parseStatus(body);

    // Resolve tracking number -> assigned admin user
    let trackingNumberId: string | null = null;
    let assignedAdminUserId: string | null = null;
    if (trackerId) {
      const { data: tracker } = await supabase
        .from('callrail_tracking_numbers')
        .select('id, assigned_admin_user_id')
        .eq('callrail_tracker_id', trackerId)
        .maybeSingle();
      if (tracker) {
        trackingNumberId = tracker.id;
        assignedAdminUserId = tracker.assigned_admin_user_id;
      }
    }
    if (!trackingNumberId && trackedNumber) {
      const { data: tracker } = await supabase
        .from('callrail_tracking_numbers')
        .select('id, assigned_admin_user_id')
        .eq('phone_e164', trackedNumber)
        .maybeSingle();
      if (tracker) {
        trackingNumberId = tracker.id;
        assignedAdminUserId = tracker.assigned_admin_user_id;
      }
    }

    // Match caller to lead or customer by normalized phone
    let matchedLeadId: string | null = null;
    let matchedCustomerId: string | null = null;
    if (callerNumber) {
      // Try sales leads first
      const { data: leads } = await supabase
        .from('sales_leads')
        .select('id, mobile')
        .eq('mobile', callerNumber)
        .order('created_at', { ascending: false })
        .limit(1);
      if (leads && leads.length > 0) {
        matchedLeadId = leads[0].id;
      } else {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, phone')
          .eq('phone', callerNumber)
          .order('created_at', { ascending: false })
          .limit(1);
        if (customers && customers.length > 0) {
          matchedCustomerId = customers[0].id;
        }
      }
    }

    const startedAt = toDateTimeOrNull(body.start_time);
    const endedAt = toDateTimeOrNull(body.end_time);
    const answeredAt = body.answered && startedAt ? startedAt : null;

    // Upsert call row
    const upsertPayload = {
      callrail_call_id: callrailCallId,
      direction: (body.direction || 'inbound').toLowerCase(),
      status,
      caller_number: callerNumber,
      caller_name: body.customer_name || null,
      caller_city: body.customer_city || null,
      caller_state: body.customer_state || null,
      tracker_id: trackerId,
      tracked_number: trackedNumber,
      tracking_number_id: trackingNumberId,
      assigned_admin_user_id: assignedAdminUserId,
      matched_lead_id: matchedLeadId,
      matched_customer_id: matchedCustomerId,
      started_at: startedAt,
      answered_at: answeredAt,
      ended_at: endedAt,
      duration_seconds: body.duration ?? null,
      recording_url: body.recording || null,
      raw: body.raw || body,
    };

    const { error: upsertError } = await supabase
      .from('callrail_calls')
      .upsert(upsertPayload, { onConflict: 'callrail_call_id' });

    if (upsertError) {
      console.error('Upsert call error:', upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log answered call to lead_call_logs if a lead match exists
    if (status === STATUS_FINISHED && matchedLeadId) {
      const { data: agent } = await supabase
        .from('admin_users')
        .select('id, first_name, last_name, email')
        .eq('id', assignedAdminUserId || '')
        .maybeSingle();
      const agentName = agent ? `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.email : null;
      await supabase.from('lead_call_logs').insert({
        lead_id: matchedLeadId,
        lead_type: 'sales_lead',
        attempt_number: 1,
        agent_id: assignedAdminUserId,
        agent_name: agentName,
        outcome: 'connected',
        notes: `CallRail answered call (${body.duration || 0}s)`,
      });
    }

    console.log('CallRail webhook processed', { callrailCallId, event, status, trackerId, assignedAdminUserId, matchedLeadId, matchedCustomerId });

    return new Response(JSON.stringify({ success: true, callrailCallId, status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unhandled CallRail webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
