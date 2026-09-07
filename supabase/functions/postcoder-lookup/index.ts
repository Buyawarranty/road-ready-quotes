import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("POSTCODER_API_KEY");
    if (!apiKey) {
      console.error("POSTCODER_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Postcoder API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, term, postcode } = await req.json();
    console.log("postcoder-lookup called with action:", action);

    let url: string;
    let response: Response;

    switch (action) {
      case "autocomplete": {
        if (!term || term.length < 3) {
          return new Response(
            JSON.stringify({ error: "Search term must be at least 3 characters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Postcoder address lookup supports partial postcode / address search
        const cleanTerm = term.trim().replace(/\s+/g, " ");
        url = `https://api.postcoder.com/pc/v2/${encodeURIComponent(cleanTerm)}/address?apikey=${apiKey}&lines=2`;
        console.log("Calling Postcoder address lookup for term:", cleanTerm);
        response = await fetch(url);
        break;
      }

      case "find": {
        if (!postcode) {
          return new Response(
            JSON.stringify({ error: "Postcode is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const cleanPostcode = postcode.replace(/\s+/g, "").toUpperCase();
        url = `https://api.postcoder.com/pc/v2/${encodeURIComponent(cleanPostcode)}/address?apikey=${apiKey}&lines=2`;
        console.log("Calling Postcoder address lookup for postcode:", cleanPostcode);
        response = await fetch(url);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: autocomplete or find" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Postcoder API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Postcoder API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Postcoder response received, addresses count:", Array.isArray(data) ? data.length : 0);

    // Postcoder returns an array of address objects directly
    if (Array.isArray(data)) {
      const suggestions = data.map((addr: any, index: number) => ({
        id: `${action}-${index}`,
        address: addr.summaryline || `${addr.addressline1}, ${addr.postcode}`,
        line_1: addr.addressline1 || "",
        line_2: addr.addressline2 || "",
        town: addr.posttown || "",
        county: addr.county || "",
        postcode: addr.postcode || "",
        building_number: addr.buildingnumber || "",
        building_name: addr.buildingname || "",
      }));

      return new Response(
        JSON.stringify({ suggestions, addresses: suggestions }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ suggestions: [], addresses: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in postcoder-lookup:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
