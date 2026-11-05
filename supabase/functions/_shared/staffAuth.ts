// Caller checks for edge functions that create, reset or approve logins.
//
// These functions run with the service role key and are deployed without JWT
// verification, so they must check the caller themselves: a signed-in staff
// member with an Admin or Super Admin role (from user_roles, or the role
// stored on their admin_users row), whose admin_users row, if they have one,
// has not been deactivated.
import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.50.2";

export interface StaffCaller {
  user: User;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export interface StaffGateOptions {
  /** Only Super Admins may call this function. */
  superAdminOnly?: boolean;
  corsHeaders: Record<string, string>;
}

const json = (status: number, body: unknown, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Returns the verified caller, or a 401/403 Response to send back as-is.
 */
export async function requireStaffAdmin(
  req: Request,
  options: StaffGateOptions,
): Promise<StaffCaller | Response> {
  const { corsHeaders, superAdminOnly = false } = options;
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Please sign in to the admin dashboard first." }, corsHeaders);

  const admin = serviceClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return json(401, { error: "Please sign in to the admin dashboard first." }, corsHeaders);

  const [{ data: roleRows }, { data: adminRow }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", user.id),
    admin.from("admin_users").select("role, is_active").eq("user_id", user.id).maybeSingle(),
  ]);

  if (adminRow && adminRow.is_active === false) {
    return json(403, { error: "Your admin access has been switched off." }, corsHeaders);
  }

  const roles = new Set<string>((roleRows ?? []).map((r: { role: string }) => String(r.role)));
  if (adminRow?.role) roles.add(String(adminRow.role));
  const isSuperAdmin = roles.has("super_admin");
  const isAdmin = isSuperAdmin || roles.has("admin");

  if (superAdminOnly ? !isSuperAdmin : !isAdmin) {
    return json(
      403,
      { error: superAdminOnly ? "Only a Super Admin can do this." : "Only a Super Admin or Admin can do this." },
      corsHeaders,
    );
  }

  return { user, isSuperAdmin, isAdmin };
}
