import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { BRANDS, brandFrom } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reminder always goes to one fixed inbox (requested by the owner) — never to an address from the request.
const REMINDER_TO = "info@buyawarranty.co.uk";
const GATE_PASSWORD = Deno.env.get("AUTH_GATE_PASSWORD") ?? "PandaPanda2026!!";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const brand = BRANDS.pandaprotect;
    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
    const { error } = await resend.emails.send({
      from: brandFrom(brand, "Panda Protect", "noreply"),
      to: [REMINDER_TO],
      subject: "Panda Protect admin login",
      html: `<h1 style="font-family:Arial">Panda Protect admin login</h1>
        <p style="font-family:Arial">Someone asked for a reminder of the access password for the Panda Protect admin login page (pandaprotect.co.uk/auth).</p>
        <p style="font-family:Arial">Access password: <strong>${GATE_PASSWORD}</strong></p>
        <p style="font-family:Arial">After unlocking, staff sign in with their own email and password.</p>`,
    });
    if (error) throw new Error(error.message);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gate reminder failed", e);
    return new Response(JSON.stringify({ success: false, error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
