// Dial9 CDR sync — pulls call records from Dial9 API (aTech v2) and upserts
// them into public.zoiper_call_events so the existing Call Stats tab shows
// Dial9 activity per salesperson.
//
// Match agents by admin_users.sip_extension == extension_username.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIAL9_BASE = Deno.env.get("DIAL9_BASE_URL") || "https://connect.dial9.co.uk";
const DIAL9_TOKEN = Deno.env.get("DIAL9_API_TOKEN") || "";
const DIAL9_SECRET = Deno.env.get("DIAL9_API_SECRET") || "";

interface Dial9Call {
  record_id: string;
  uuid: string;
  initiated_at: number;
  ended_at: number | null;
  direction: string; // "Outgoing" | "Incoming"
  length: number;
  source?: { e164?: string; formatted?: string };
  destination?: { e164?: string; formatted?: string };
  extension_username?: string | null;
  extension_description?: string | null;
  connected_to_extension?: boolean;
}

async function dial9Post(path: string, body: unknown) {
  const r = await fetch(`${DIAL9_BASE}${path}`, {
    method: "POST",
    headers: {
      "X-Auth-Token": DIAL9_TOKEN,
      "X-Auth-Secret": DIAL9_SECRET,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await r.text();
  try { return { ok: r.ok, status: r.status, json: JSON.parse(text) }; }
  catch { return { ok: r.ok, status: r.status, json: null, text }; }
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

  // Default window: last 24h. Cron every 5m keeps this tiny.
  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const hoursBack = Number(url.searchParams.get("hours") || "24");
  const sinceMs = sinceParam ? new Date(sinceParam).getTime() : Date.now() - hoursBack * 3600 * 1000;
  const sinceUnix = Math.floor(sinceMs / 1000);

  const maxPages = Number(url.searchParams.get("max_pages") || "10");
  const perPage = 100;

  // Load extension → user map once
  const { data: agents } = await supabase
    .from("admin_users")
    .select("id, email, sip_extension");
  const byExt = new Map<string, { id: string; email: string }>();
  for (const a of agents || []) {
    if (a.sip_extension) byExt.set(String(a.sip_extension).trim(), { id: a.id, email: a.email });
  }

  let fetched = 0;
  let upserted = 0;
  let stopped = false;

  for (let page = 1; page <= maxPages && !stopped; page++) {
    const res = await dial9Post("/api/v2/calls/list", { page, per_page: perPage });
    if (!res.ok || res.json?.status !== "success") {
      console.error("dial9 list failed", res.status, res.json ?? res.text);
      return new Response(JSON.stringify({ error: "dial9 fetch failed", detail: res.json ?? res.text }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const rows: Dial9Call[] = res.json.data || [];
    fetched += rows.length;
    if (rows.length === 0) break;

    for (const c of rows) {
      if (c.initiated_at && c.initiated_at < sinceUnix) { stopped = true; continue; }

      const direction = (c.direction || "").toLowerCase() === "incoming" ? "inbound" : "outbound";
      const connected = !!c.connected_to_extension;
      const status = connected ? "answered" : (direction === "inbound" ? "missed" : "no-answer");
      const extension = c.extension_username ? String(c.extension_username).trim() : null;
      const startedAt = c.initiated_at ? new Date(c.initiated_at * 1000).toISOString() : null;
      const endedAt = c.ended_at ? new Date(c.ended_at * 1000).toISOString() : null;
      const duration = Number(c.length || 0);
      const talkSeconds = connected ? duration : 0;

      const agent = extension ? byExt.get(extension) : undefined;

      const { error } = await supabase.from("zoiper_call_events").upsert({
        external_call_id: c.record_id || c.uuid,
        agent_email: agent?.email || null,
        agent_extension: extension,
        agent_user_id: agent?.id || null,
        direction,
        status,
        dialed_number: c.destination?.e164 || null,
        caller_number: c.source?.e164 || null,
        started_at: startedAt,
        answered_at: connected ? startedAt : null,
        ended_at: endedAt,
        duration_seconds: duration,
        talk_seconds: talkSeconds,
        raw_payload: c as unknown as Record<string, unknown>,
      }, { onConflict: "external_call_id" });

      if (error) console.error("upsert error", c.record_id, error.message);
      else upserted++;
    }

    if (rows.length < perPage) break;
  }

  return new Response(JSON.stringify({
    ok: true, fetched, upserted,
    since: new Date(sinceMs).toISOString(),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
