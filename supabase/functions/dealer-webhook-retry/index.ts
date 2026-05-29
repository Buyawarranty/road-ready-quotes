// Scheduled retry for failed webhook deliveries.
// Invoked every minute by pg_cron. Looks up failed deliveries whose
// next_retry_at <= now() and attempts < max_attempts, then re-POSTs them
// with exponential backoff (1m, 5m, 15m, 1h, 6h, 24h).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// minutes
const BACKOFF = [1, 5, 15, 60, 360, 1440];

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function retry(delivery: any) {
  const { data: endpoint } = await admin
    .from("api_webhook_endpoints")
    .select("*")
    .eq("id", delivery.endpoint_id)
    .maybeSingle();
  if (!endpoint || !endpoint.active) {
    await admin
      .from("api_webhook_deliveries")
      .update({ status: "abandoned", response_body: "endpoint missing or inactive" })
      .eq("id", delivery.id);
    return { id: delivery.id, ok: false, reason: "endpoint_missing" };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    event: delivery.event_type,
    created: timestamp,
    data: delivery.payload,
    retry: true,
    attempt: (delivery.attempts || 0) + 1,
  });
  const signature = await hmacSha256Hex(endpoint.secret, `${timestamp}.${body}`);
  const attempts = (delivery.attempts || 0) + 1;

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Panda-Signature": `t=${timestamp},v1=${signature}`,
        "X-Panda-Event": delivery.event_type,
        "X-Panda-Retry": String(attempts),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text().catch(() => "");
    const ok = res.ok;
    const max = delivery.max_attempts || 6;
    let next_retry_at: string | null = null;
    let status = ok ? "success" : "failed";
    if (!ok && attempts < max) {
      const mins = BACKOFF[Math.min(attempts, BACKOFF.length - 1)];
      next_retry_at = new Date(Date.now() + mins * 60_000).toISOString();
    } else if (!ok) {
      status = "abandoned";
    }
    await admin
      .from("api_webhook_deliveries")
      .update({
        attempts,
        status,
        response_status: res.status,
        response_body: text.slice(0, 2000),
        last_attempt_at: new Date().toISOString(),
        next_retry_at,
      })
      .eq("id", delivery.id);
    return { id: delivery.id, ok, status: res.status, attempts };
  } catch (e) {
    const max = delivery.max_attempts || 6;
    const willRetry = attempts < max;
    const mins = BACKOFF[Math.min(attempts, BACKOFF.length - 1)];
    await admin
      .from("api_webhook_deliveries")
      .update({
        attempts,
        status: willRetry ? "failed" : "abandoned",
        response_body: (e as Error).message.slice(0, 2000),
        last_attempt_at: new Date().toISOString(),
        next_retry_at: willRetry ? new Date(Date.now() + mins * 60_000).toISOString() : null,
      })
      .eq("id", delivery.id);
    return { id: delivery.id, ok: false, error: (e as Error).message, attempts };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require service role (cron passes it)
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const nowIso = new Date().toISOString();
  const { data: due } = await admin
    .from("api_webhook_deliveries")
    .select("*")
    .eq("status", "failed")
    .lte("next_retry_at", nowIso)
    .limit(50);

  // Also pick up failed rows that never got a next_retry_at scheduled (legacy)
  const { data: legacy } = await admin
    .from("api_webhook_deliveries")
    .select("*")
    .eq("status", "failed")
    .is("next_retry_at", null)
    .limit(50);

  const all = [...(due || []), ...(legacy || [])];
  const results = await Promise.all(all.map(retry));
  return json({ processed: results.length, results });
});
