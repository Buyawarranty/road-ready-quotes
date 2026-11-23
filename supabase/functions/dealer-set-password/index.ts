// Sets a new dealer portal password and returns it once so staff can share it.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireStaffAdmin, serviceClient } from "../_shared/staffAuth.ts";
import { SET_PASSWORD_PERMISSION, canManageSignupAction } from "../_shared/dealerSignupActionAccess.ts";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("") + "!7";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireStaffAdmin(req, { corsHeaders });
    if (caller instanceof Response) return caller;
    const admin = serviceClient();
    const [{ data: roles }, { data: staff }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", caller.user.id),
      admin.from("admin_users").select("permissions").eq("user_id", caller.user.id).maybeSingle(),
    ]);
    if (!canManageSignupAction((roles ?? []).map((r: { role: string }) => r.role), staff?.permissions as Record<string, unknown>, SET_PASSWORD_PERMISSION)) {
      return json(403, { error: "This action requires its User permissions checkbox." });
    }
    const body = await req.json().catch(() => ({}));
    const dealerId = typeof body?.dealer_id === "string" ? body.dealer_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(dealerId)) return json(400, { error: "dealer_id is required" });
    const { data: dealer } = await admin.from("dealers").select("id, user_id, email").eq("id", dealerId).maybeSingle();
    if (!dealer?.user_id) return json(404, { error: "This dealer has no portal login yet. Approve them first." });
    const password = generatePassword();
    const { data: u } = await admin.auth.admin.getUserById(dealer.user_id);
    const { error } = await admin.auth.admin.updateUserById(dealer.user_id, { password, user_metadata: { ...(u?.user?.user_metadata ?? {}), must_change_password: false } });
    if (error) return json(500, { error: `Could not set the password: ${error.message}` });
    return json(200, { success: true, email: dealer.email, password });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "Unexpected error" });
  }
});
