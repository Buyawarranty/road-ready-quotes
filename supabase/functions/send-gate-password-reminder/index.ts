import { resendFetch, polishResend } from "../_shared/emailPolish.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { BRANDS, brandFrom } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reminder always goes to one fixed inbox (requested by the owner) — never to an address from the request.
const REMINDER_TO = "hello@pandaprotect.co.uk";
const GATE_PASSWORD = Deno.env.get("AUTH_GATE_PASSWORD") ?? "PandaPanda2026!!";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const brand = BRANDS.pandaprotect;
    const resend = polishResend(new Resend(Deno.env.get("RESEND_API_KEY") as string));
    const { error } = await resend.emails.send({
      from: brandFrom(brand, "Panda Protect", "noreply"),
      to: [REMINDER_TO],
      subject: "Staff login page — access password reminder",
      html: `<h1 style="font-family:Arial">Access password reminder</h1>
        <p style="font-family:Arial">Someone clicked <strong>"Forgot the access password?"</strong> on the staff login page at <a href="https://pandaprotect.co.uk/auth">pandaprotect.co.uk/auth</a>, so here is the password that unlocks that page:</p>
        <p style="font-family:Arial;font-size:18px">Access password: <strong>${GATE_PASSWORD}</strong></p>
        <p style="font-family:Arial">Enter it on the login page, then sign in with your own staff email and password as usual.</p>
        <p style="font-family:Arial;color:#666;font-size:13px">If you didn't ask for this, you can ignore it — the password has not changed and no one has signed in.</p>`,
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
