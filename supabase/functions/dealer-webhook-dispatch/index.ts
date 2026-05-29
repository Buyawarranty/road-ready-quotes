// Outbound webhook dispatcher for the Dealer API
// Invoke from edge functions or DB triggers when an event happens.
//
// POST body: { dealer_id: string, event_type: string, payload: object }
// For each active endpoint matching the event, signs the body with HMAC-SHA256
// using the endpoint secret and POSTs it. Logs every attempt to
// api_webhook_deliveries.
//
// Standard event types:
//   warranty.created, warranty.activated, warranty.cancelled
//   quote.created, quote.updated
//   claim.created, claim.updated

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
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

async function deliver(endpoint: any, eventType: string, payload: any) {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ event: eventType, created: timestamp, data: payload });
  const signature = await hmacSha256Hex(endpoint.secret, `${timestamp}.${body}`);

  const { data: log } = await admin
    .from("api_webhook_deliveries")
    .insert({
      endpoint_id: endpoint.id,
      dealer_id: endpoint.dealer_id,
      event_type: eventType,
      payload,
      status: "pending",
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Panda-Signature": `t=${timestamp},v1=${signature}`,
        "X-Panda-Event": eventType,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text().catch(() => "");
    await admin
      .from("api_webhook_deliveries")
      .update({
        status: res.ok ? "success" : "failed",
        response_status: res.status,
        response_body: text.slice(0, 2000),
      })
      .eq("id", log?.id);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    await admin
      .from("api_webhook_deliveries")
      .update({ status: "failed", response_body: (e as Error).message.slice(0, 2000) })
      .eq("id", log?.id);
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Internal call protection: require service-role key or shared internal secret
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (auth !== expected) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { dealer_id, event_type, payload } = body || {};
  if (!dealer_id || !event_type) return json({ error: "dealer_id and event_type required" }, 400);

  const { data: endpoints } = await admin
    .from("api_webhook_endpoints")
    .select("*")
    .eq("dealer_id", dealer_id)
    .eq("active", true);

  const matched = (endpoints || []).filter(
    (e: any) => !e.events?.length || e.events.includes(event_type) || e.events.includes("*"),
  );

  const results = await Promise.all(matched.map((e: any) => deliver(e, event_type, payload)));
  return json({ delivered: results.length, results });
});
