-- BDM access must follow the real role store (public.user_roles) plus the existing access switches.

CREATE OR REPLACE FUNCTION public.bdm_has_role(_uid uuid, _roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $bdm$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = _uid AND r.role::text = ANY(_roles)
  );
$bdm$;

CREATE OR REPLACE FUNCTION public.bdm_access_ok(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $bdm$
  SELECT public.bdm_has_role(_uid, ARRAY[
      'super_admin','admin','member','viewer','guest','sales','sales_lead','sales_manager',
      'performance_manager','blog_writer','dev_tester','accounts_manager','accounts_payroll',
      'lead_gen','accounts','claims_agent','claims_manager','bdm','manager'])
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.user_id = _uid
        AND (
          COALESCE(a.is_active, TRUE) = FALSE
          OR (a.permissions ->> 'admin_dashboard_access' = 'false'
              AND NOT public.bdm_has_role(_uid, ARRAY['super_admin']))
        )
    );
$bdm$;

CREATE OR REPLACE FUNCTION public.bdm_is_staff(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $bdm$
  SELECT public.bdm_access_ok(_uid);
$bdm$;

CREATE OR REPLACE FUNCTION public.bdm_is_manager(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $bdm$
  SELECT public.bdm_access_ok(_uid)
     AND public.bdm_has_role(_uid, ARRAY['super_admin','admin','sales_manager']);
$bdm$;

CREATE OR REPLACE FUNCTION public.bdm_is_super(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $bdm$
  SELECT public.bdm_access_ok(_uid)
     AND public.bdm_has_role(_uid, ARRAY['super_admin']);
$bdm$;

CREATE OR REPLACE FUNCTION public.bdm_is_town_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $bdm$
  SELECT public.bdm_access_ok(_uid)
     AND public.bdm_has_role(_uid, ARRAY['super_admin','admin']);
$bdm$;

CREATE OR REPLACE FUNCTION public.bdm_staff_list()
RETURNS TABLE(user_id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $bdm$
  SELECT u.id,
         COALESCE(
           NULLIF(TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')), ''),
           u.email
         ) AS name
  FROM auth.users u
  LEFT JOIN public.admin_users a ON a.user_id = u.id
  WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
    AND public.bdm_access_ok(u.id)
  ORDER BY 2;
$bdm$;

GRANT EXECUTE ON FUNCTION public.bdm_has_role(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bdm_access_ok(uuid) TO authenticated, service_role;