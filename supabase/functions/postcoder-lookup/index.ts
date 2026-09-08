import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("POSTCODER_API_KEY");
    if (!apiKey) {
      console.error("POSTCODER_API_KEY not configured");
      return json({ error: "Postcoder API key not configured" }, 500);
    }

    const { action, term, id, pathfilter, postcode } = await req.json();
    console.log("postcoder-lookup action:", action, "term:", term, "pathfilter:", pathfilter ?? "");

    // --- Autocomplete: returns addresses (ADD) and groups (GRP) for narrowing ---
    if (action === "autocomplete") {
      const query = (term || "").trim();
      if (query.length < 3) return json({ suggestions: [] });

      const url = new URL("https://ws.postcoder.com/pcw/autocomplete/find");
      url.searchParams.set("query", query);
      url.searchParams.set("country", "UK");
      url.searchParams.set("apikey", apiKey);
      url.searchParams.set("format", "json");
      if (pathfilter) url.searchParams.set("pathfilter", pathfilter);

      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      const text = await res.text();
      if (!res.ok) {
        console.error("Postcoder autocomplete error:", res.status, text);
        return json({ error: `Postcoder error ${res.status}`, details: text }, 200);
      }

      let data: any;
      try { data = JSON.parse(text); } catch { data = []; }
      const list: any[] = Array.isArray(data) ? data : (data?.suggestions ?? []);

      const suggestions = list.map((s: any) => {
        const isGroup = (s.type || "").toUpperCase() === "GRP" || (s.count && Number(s.count) > 1);
        const label = [s.summaryline, s.locationsummary].filter(Boolean).join(", ");
        return {
          id: s.id,
          type: isGroup ? "group" : "address",
          count: s.count ? Number(s.count) : undefined,
          address: isGroup && s.count ? `${label} (${s.count} addresses)` : label,
        };
      });

      console.log("Postcoder autocomplete results:", suggestions.length);
      return json({ suggestions });
    }

    // --- Retrieve a full address by autocomplete id ---
    if (action === "get" || action === "retrieve") {
      if (!id) return json({ error: "Address id is required" }, 400);

      const url = new URL("https://ws.postcoder.com/pcw/autocomplete/retrieve");
      url.searchParams.set("id", id);
      url.searchParams.set("query", (term || "").trim());
      url.searchParams.set("country", "UK");
      url.searchParams.set("apikey", apiKey);
      url.searchParams.set("format", "json");
      url.searchParams.set("lines", "2");

      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      const text = await res.text();
      if (!res.ok) {
        console.error("Postcoder retrieve error:", res.status, text);
        return json({ error: `Postcoder error ${res.status}`, details: text }, 200);
      }

      let data: any;
      try { data = JSON.parse(text); } catch { data = []; }
      const a = Array.isArray(data) ? data[0] : data;
      if (!a) return json({ error: "Address not found" }, 200);

      return json({
        address: {
          line_1: a.addressline1 || "",
          line_2: a.addressline2 || "",
          town: a.posttown || "",
          county: a.county || "",
          postcode: a.postcode || "",
          building_number: a.buildingnumber || "",
          building_name: a.buildingname || "",
        },
      });
    }

    // --- Full postcode lookup (list every address at a postcode) ---
    if (action === "find") {
      const pc = (postcode || term || "").replace(/\s+/g, "").toUpperCase();
      if (!pc) return json({ error: "Postcode is required" }, 400);

      const url = new URL(
        `https://ws.postcoder.com/pcw/${encodeURIComponent(apiKey)}/address/UK/${encodeURIComponent(pc)}`
      );
      url.searchParams.set("format", "json");
      url.searchParams.set("lines", "2");

      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      const text = await res.text();
      if (!res.ok) {
        console.error("Postcoder find error:", res.status, text);
        return json({ error: `Postcoder error ${res.status}`, details: text }, 200);
      }

      let data: any;
      try { data = JSON.parse(text); } catch { data = []; }
      const list: any[] = Array.isArray(data) ? data : [];

      const suggestions = list.map((a: any, i: number) => ({
        id: `pc-${i}`,
        type: "address",
        address: a.summaryline || `${a.addressline1 || ""}, ${a.postcode || ""}`,
        line_1: a.addressline1 || "",
        line_2: a.addressline2 || "",
        town: a.posttown || "",
        county: a.county || "",
        postcode: a.postcode || "",
        building_number: a.buildingnumber || "",
        building_name: a.buildingname || "",
      }));

      return json({ suggestions, addresses: suggestions });
    }

    return json({ error: "Invalid action. Use: autocomplete, get or find" }, 400);
  } catch (error) {
    console.error("Error in postcoder-lookup:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
