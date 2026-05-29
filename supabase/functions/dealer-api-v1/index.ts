// Public Dealer REST API v1
// Auth: header `Authorization: Bearer lvf_xxx` (key from /dealer-portal/settings/api)
//
// Endpoints:
//   GET  /warranties              list dealer warranties
//   GET  /warranties/:id          get one warranty
//   POST /warranties              create a warranty (quote -> warranty)
//   GET  /quotes                  list quotes
//   GET  /quotes/:id              get one quote
//   POST /quotes                  create a quote
//   GET  /customers               list customers
//   GET  /me                      current dealer info (key check)
//
// All responses JSON. Errors: { error: string, code?: string }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

interface AuthedKey {
  id: string;
  dealer_id: string;
  scopes: string[] | null;
  mode: "live" | "test";
}

async function dispatchWebhook(dealer_id: string, event_type: string, payload: any) {
  // fire-and-forget: invoke the dispatcher without awaiting
  fetch(`${SUPABASE_URL}/functions/v1/dealer-webhook-dispatch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dealer_id, event_type, payload }),
  }).catch(() => {});
}

async function authenticate(req: Request): Promise<
  | { ok: true; key: AuthedKey }
  | { ok: false; res: Response }
> {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return {
      ok: false,
      res: json(
        { error: "Missing Bearer token. Send `Authorization: Bearer lvf_...`" },
        401,
      ),
    };
  }
  const raw = match[1];
  if (!raw.startsWith("lvf_")) {
    return { ok: false, res: json({ error: "Invalid API key format" }, 401) };
  }
  const key_hash = await sha256Hex(raw);
  const { data, error } = await admin
    .from("dealer_api_keys")
    .select("id, dealer_id, scopes, revoked_at")
    .eq("key_hash", key_hash)
    .maybeSingle();
  if (error || !data) return { ok: false, res: json({ error: "Invalid API key" }, 401) };
  if (data.revoked_at) return { ok: false, res: json({ error: "API key revoked" }, 401) };

  // fire-and-forget last_used update
  admin
    .from("dealer_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return { ok: true, key: data as AuthedKey };
}

function parsePath(url: URL): { resource: string; id?: string } {
  // strip everything up to and including /dealer-api-v1
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "dealer-api-v1");
  const rest = idx >= 0 ? parts.slice(idx + 1) : parts;
  return { resource: rest[0] || "", id: rest[1] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticate(req);
  if (!auth.ok) return auth.res;
  const dealer_id = auth.key.dealer_id;

  const url = new URL(req.url);
  const { resource, id } = parsePath(url);

  try {
    // GET /me
    if (resource === "me" && req.method === "GET") {
      const { data } = await admin
        .from("dealers")
        .select("id, name, email, company_name, phone")
        .eq("id", dealer_id)
        .maybeSingle();
      return json({ dealer: data });
    }

    // ---------- WARRANTIES ----------
    if (resource === "warranties") {
      if (req.method === "GET" && id) {
        const { data, error } = await admin
          .from("dealer_warranties")
          .select("*")
          .eq("id", id)
          .eq("dealer_id", dealer_id)
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data) return json({ error: "Not found" }, 404);
        return json({ warranty: data });
      }
      if (req.method === "GET") {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const { data, error, count } = await admin
          .from("dealer_warranties")
          .select("*", { count: "exact" })
          .eq("dealer_id", dealer_id)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) return json({ error: error.message }, 400);
        return json({ warranties: data || [], total: count ?? 0, limit, offset });
      }
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const required = ["customer_name", "vehicle_reg", "plan_type", "warranty_duration"];
        for (const k of required) {
          if (!body[k]) return json({ error: `Missing field: ${k}` }, 400);
        }
        const { data, error } = await admin
          .from("dealer_warranties")
          .insert({
            dealer_id,
            customer_name: body.customer_name,
            customer_email: body.customer_email || null,
            customer_phone: body.customer_phone || null,
            vehicle_reg: body.vehicle_reg,
            vehicle_make: body.vehicle_make || null,
            vehicle_model: body.vehicle_model || null,
            mileage: body.mileage || null,
            plan_type: body.plan_type,
            warranty_duration: body.warranty_duration,
            price: body.price || null,
            status: body.status || "pending",
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        return json({ warranty: data }, 201);
      }
    }

    // ---------- QUOTES ----------
    if (resource === "quotes") {
      if (req.method === "GET" && id) {
        const { data, error } = await admin
          .from("dealer_quotes")
          .select("*")
          .eq("id", id)
          .eq("dealer_id", dealer_id)
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data) return json({ error: "Not found" }, 404);
        return json({ quote: data });
      }
      if (req.method === "GET") {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const { data, error, count } = await admin
          .from("dealer_quotes")
          .select("*", { count: "exact" })
          .eq("dealer_id", dealer_id)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) return json({ error: error.message }, 400);
        return json({ quotes: data || [], total: count ?? 0, limit, offset });
      }
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const required = ["customer_name", "vehicle_reg", "plan_type", "warranty_duration", "price"];
        for (const k of required) {
          if (body[k] === undefined || body[k] === null || body[k] === "") {
            return json({ error: `Missing field: ${k}` }, 400);
          }
        }
        const { data, error } = await admin
          .from("dealer_quotes")
          .insert({
            dealer_id,
            customer_name: body.customer_name,
            customer_email: body.customer_email || null,
            customer_phone: body.customer_phone || null,
            vehicle_reg: body.vehicle_reg,
            vehicle_make: body.vehicle_make || null,
            vehicle_model: body.vehicle_model || null,
            mileage: body.mileage || null,
            warranty_duration: body.warranty_duration,
            plan_type: body.plan_type,
            price: body.price,
            status: body.status || "draft",
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        return json({ quote: data }, 201);
      }
    }

    // ---------- CUSTOMERS ----------
    if (resource === "customers" && req.method === "GET") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const { data, error, count } = await admin
        .from("dealer_customers")
        .select("*", { count: "exact" })
        .eq("dealer_id", dealer_id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) return json({ error: error.message }, 400);
      return json({ customers: data || [], total: count ?? 0, limit, offset });
    }

    return json(
      {
        error: "Unknown endpoint",
        hint: "See /dealer-portal/api-docs for the full reference",
        path: url.pathname,
      },
      404,
    );
  } catch (e) {
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
