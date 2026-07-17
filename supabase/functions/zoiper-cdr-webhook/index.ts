import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-zoiper-secret",
};

// Public webhook (verify_jwt = false). Authenticated via shared header secret.
// Expected POST body from Zoiper Biz / SIP PBX CDR webhook (loose schema — we
// tolerate different field names because Zoiper and PBXes vary).

interface ZoiperCdrPayload {
  id?: string;
  call_id?: string;
  uniqueid?: string;
  direction?: string; // inbound | outbound
  status?: string; // answered | missed | busy | no-answer | voicemail
  disposition?: string;
  extension?: string;
  agent_extension?: string;
  from_extension?: string;
  to_extension?: string;
  agent_email?: string;
  user_email?: string;
  from?: string;
  to?: string;
  caller?: string;
  callee?: string;
  from_number?: string;
  to_number?: string;
  start?: string;
  start_time?: string;
  answer?: string;
  answered_at?: string;
  end?: string;
  end_time?: string;
  duration?: number;
  billsec?: number;
  talk_time?: number;
}

function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeStatus(raw?: string): string {
  const s = (raw || "").toLowerCase();
  if (!s) return "unknown";
  if (["answered", "completed", "connected"].includes(s)) return "answered";
  if (["missed", "no-answer", "noanswer", "no_answer"].includes(s)) return "missed";
  if (["busy", "failed", "cancelled", "canceled"].includes(s)) return s;
  if (["voicemail", "vm"].includes(s)) return "voicemail";
  return s;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("ZOIPER_WEBHOOK_SECRET");
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "ZOIPER_WEBHOOK_SECRET not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const provided = req.headers.get("x-zoiper-secret");
  if (provided !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let body: ZoiperCdrPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const externalId = body.id || body.call_id || body.uniqueid || crypto.randomUUID();
  const direction = (body.direction || "outbound").toLowerCase();
  const status = normalizeStatus(body.status || body.disposition);
  const extension =
    body.agent_extension ||
    body.extension ||
    (direction === "outbound" ? body.from_extension : body.to_extension) ||
    null;
  const dialedNumber =
    body.to_number || body.to || body.callee || (direction === "outbound" ? body.to : null) || null;
  const callerNumber =
    body.from_number || body.from || body.caller || (direction === "inbound" ? body.from : null) || null;

  const startedAt = toIsoOrNull(body.start || body.start_time);
  const answeredAt = toIsoOrNull(body.answer || body.answered_at);
  const endedAt = toIsoOrNull(body.end || body.end_time);
  const duration = Number(body.duration ?? 0) || 0;
  const talkSeconds = Number(body.talk_time ?? body.billsec ?? 0) || 0;

  // Match agent by sip_extension, then by email fallback
  let agentUserId: string | null = null;
  let agentEmail: string | null = body.agent_email || body.user_email || null;
  if (extension) {
    const { data: byExt } = await supabase
      .from("admin_users")
      .select("id, email")
      .eq("sip_extension", String(extension))
      .maybeSingle();
    if (byExt) {
      agentUserId = byExt.id;
      agentEmail = agentEmail || byExt.email;
    }
  }
  if (!agentUserId && agentEmail) {
    const { data: byEmail } = await supabase
      .from("admin_users")
      .select("id, email")
      .eq("email", agentEmail.toLowerCase())
      .maybeSingle();
    if (byEmail) agentUserId = byEmail.id;
  }

  const { error } = await supabase.from("zoiper_call_events").upsert(
    {
      external_call_id: externalId,
      agent_email: agentEmail,
      agent_extension: extension ? String(extension) : null,
      agent_user_id: agentUserId,
      direction,
      status,
      dialed_number: dialedNumber,
      caller_number: callerNumber,
      started_at: startedAt,
      answered_at: answeredAt,
      ended_at: endedAt,
      duration_seconds: duration,
      talk_seconds: talkSeconds,
      raw_payload: body as unknown as Record<string, unknown>,
    },
    { onConflict: "external_call_id" },
  );

  if (error) {
    console.error("zoiper-cdr-webhook insert error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, external_call_id: externalId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
