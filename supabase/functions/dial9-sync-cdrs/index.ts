// Dial9 CDR sync — pulls recent call records from Dial9 API and upserts
// them into public.zoiper_call_events so the existing Call Stats tab can
// display Dial9 activity per salesperson.
//
// Auth: Dial9 (aTech) uses two headers — X-Auth-Token and X-Auth-Secret.
// If your Dial9 account uses HTTP Basic auth instead, set DIAL9_AUTH_MODE=basic.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIAL9_BASE = Deno.env.get("DIAL9_BASE_URL") || "https://connect.dial9.co.uk";
const DIAL9_UNIT = Deno.env.get("DIAL9_UNIT_ID") || "12667";
const DIAL9_TOKEN = Deno.env.get("DIAL9_API_TOKEN") || "";
const DIAL9_SECRET = Deno.env.get("DIAL9_API_SECRET") || "";
const DIAL9_AUTH_MODE = (Deno.env.get("DIAL9_AUTH_MODE") || "headers").toLowerCase();

function authHeaders(): Record<string, string> {
  if (DIAL9_AUTH_MODE === "basic") {
    const b64 = btoa(`${DIAL9_TOKEN}:${DIAL9_SECRET}`);
    return { Authorization: `Basic ${b64}` };
  }
  return {
    "X-Auth-Token": DIAL9_TOKEN,
    "X-Auth-Secret": DIAL9_SECRET,
  };
}

function toIso(v: unknown): string | null {
  if (!v) return null;
  const s = typeof v === "number" ? new Date(v * 1000) : new Date(String(v));
  return isNaN(s.getTime()) ? null : s.toISOString();
}

function normStatus(s: unknown): string {
  const v = String(s || "").toLowerCase();
  if (["answered", "completed", "ended"].includes(v)) return "answered";
  if (["missed", "no-answer", "noanswer", "no_answer"].includes(v)) return "missed";
  if (["busy"].includes(v)) return "busy";
  if (["failed"].includes(v)) return "failed";
  if (["voicemail"].includes(v)) return "voicemail";
  return v || "unknown";
}

async function fetchCdrs(sinceIso: string): Promise<any[]> {
  // Try a couple of endpoint shapes Dial9/aTech commonly uses. Log the
  // first successful one so we can lock this down after first run.
  const candidates = [
    `${DIAL9_BASE}/api/v2/calls?since=${encodeURIComponent(sinceIso)}`,
    `${DIAL9_BASE}/api/v2/cdrs?since=${encodeURIComponent(sinceIso)}`,
    `${DIAL9_BASE}/api/v1/cdrs?since=${encodeURIComponent(sinceIso)}`,
    `${DIAL9_BASE}/api/v1/statistics/cdr?date_from=${encodeURIComponent(sinceIso)}`,
    `${DIAL9_BASE}/api/v1/reports/cdr?date_from=${encodeURIComponent(sinceIso)}`,
    `${DIAL9_BASE}/api/units/${DIAL9_UNIT}/calls?since=${encodeURIComponent(sinceIso)}`,
    `${DIAL9_BASE}/unit/${DIAL9_UNIT}/api/v1/calls?since=${encodeURIComponent(sinceIso)}`,
    `${DIAL9_BASE}/unit/${DIAL9_UNIT}/api/v1/cdrs?since=${encodeURIComponent(sinceIso)}`,
    `${DIAL9_BASE}/api/v1/ping`,
    `${DIAL9_BASE}/api/v2/ping`,
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
      const text = await r.text();
      if (!r.ok) {
        console.log(`dial9 ${url} -> ${r.status} ${text.slice(0, 200)}`);
        continue;
      }
      let json: any;
      try { json = JSON.parse(text); } catch { continue; }
      const rows = Array.isArray(json) ? json
        : Array.isArray(json?.calls) ? json.calls
        : Array.isArray(json?.data) ? json.data
        : Array.isArray(json?.results) ? json.results
        : [];
      console.log(`dial9 ${url} -> ${rows.length} rows`);
      return rows;
    } catch (e) {
      console.log(`dial9 ${url} -> error ${(e as Error).message}`);
    }
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!DIAL9_TOKEN || !DIAL9_SECRET) {
    return new Response(JSON.stringify({ error: "DIAL9_API_TOKEN / DIAL9_API_SECRET not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Pull anything from the last 24h by default; caller can override via ?since=ISO
  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const rows = await fetchCdrs(since);

  // Load extension → user map once
  const { data: agents } = await supabase
    .from("admin_users")
    .select("id, email, sip_extension");
  const byExt = new Map<string, { id: string; email: string }>();
  const byEmail = new Map<string, { id: string; email: string }>();
  for (const a of agents || []) {
    if (a.sip_extension) byExt.set(String(a.sip_extension), { id: a.id, email: a.email });
    if (a.email) byEmail.set(a.email.toLowerCase(), { id: a.id, email: a.email });
  }

  let inserted = 0;
  for (const c of rows) {
    const externalId = String(c.id ?? c.uuid ?? c.call_id ?? c.uniqueid ?? crypto.randomUUID());
    const direction = String(c.direction || c.type || "outbound").toLowerCase();
    const status = normStatus(c.status || c.disposition || c.result);
    const extension = String(
      c.extension || c.agent_extension || c.user_extension ||
      (direction === "outbound" ? c.from_extension : c.to_extension) || ""
    ) || null;
    const dialedNumber = String(c.to || c.to_number || c.destination || c.callee || "") || null;
    const callerNumber = String(c.from || c.from_number || c.caller_id || c.caller || "") || null;
    const startedAt = toIso(c.started_at || c.start_time || c.start || c.created_at);
    const answeredAt = toIso(c.answered_at || c.answer_time || c.answer);
    const endedAt = toIso(c.ended_at || c.end_time || c.end);
    const duration = Number(c.duration ?? c.duration_seconds ?? 0) || 0;
    const talkSeconds = Number(c.talk_time ?? c.billsec ?? c.talk_seconds ?? 0) || 0;

    let agent = extension ? byExt.get(String(extension)) : undefined;
    const agentEmail = c.agent_email || c.user_email || c.user?.email || null;
    if (!agent && agentEmail) agent = byEmail.get(String(agentEmail).toLowerCase());

    const { error } = await supabase.from("zoiper_call_events").upsert({
      external_call_id: externalId,
      agent_email: agent?.email || agentEmail || null,
      agent_extension: extension,
      agent_user_id: agent?.id || null,
      direction,
      status,
      dialed_number: dialedNumber,
      caller_number: callerNumber,
      started_at: startedAt,
      answered_at: answeredAt,
      ended_at: endedAt,
      duration_seconds: duration,
      talk_seconds: talkSeconds,
      raw_payload: c as Record<string, unknown>,
    }, { onConflict: "external_call_id" });

    if (error) console.error("upsert error", externalId, error.message);
    else inserted++;
  }

  return new Response(JSON.stringify({ ok: true, fetched: rows.length, upserted: inserted, since }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
