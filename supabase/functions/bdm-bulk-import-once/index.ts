// TEMPORARY one-time loader for the town-by-town AutoTrader list. Delete after use.
import { createClient } from "npm:@supabase/supabase-js@2";
const TOKEN = "951ccb9725b70af49a47f95c9bef534438b0301fe74d36a1";
Deno.serve(async (req) => {
  if (req.headers.get("x-import-token") !== TOKEN) return new Response("no", { status: 403 });
  const rows: any[] = await req.json();
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const urls = rows.map((r) => r[8]).filter(Boolean);
  const { data: ex, error: e1 } = await sb.from("bdm_dealerships").select("autotrader_url").in("autotrader_url", urls);
  if (e1) return new Response(JSON.stringify(e1), { status: 500 });
  const have = new Set((ex ?? []).map((x: any) => x.autotrader_url));
  const pc = /([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s*$/i;
  const ins = rows.filter((r) => !r[8] || !have.has(r[8])).map((r) => {
    const parts = (r[2] ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const m = (r[2] ?? "").match(pc);
    const digits = (r[4] ?? "").replace(/\D/g, "").replace(/^44/, "").replace(/^0/, "");
    let dom: string | null = null;
    try { if (r[3]) dom = new URL(r[3]).hostname.replace(/^www\./, ""); } catch { /* */ }
    return { name: r[0], town: r[1], address: r[2], website: r[3], website_domain: dom, phone: r[4],
      phone_digits: digits || null, star_rating: r[5], review_count: r[6], vehicle_stock: r[7],
      stock_updated_at: r[7] != null ? new Date().toISOString() : null, autotrader_url: r[8],
      postcode: m ? m[1].toUpperCase() : null, county: parts.length >= 3 ? parts[parts.length - 2] : null,
      lead_source: "AutoTrader", stage: "new_lead", priority: "medium" };
  });
  if (ins.length) { const { error } = await sb.from("bdm_dealerships").insert(ins); if (error) return new Response(JSON.stringify(error), { status: 500 }); }
  return new Response(JSON.stringify({ received: rows.length, inserted: ins.length, skipped: rows.length - ins.length }));
});
