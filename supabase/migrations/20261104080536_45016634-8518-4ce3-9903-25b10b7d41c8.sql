ALTER TABLE public.bdm_dealerships
  ADD COLUMN IF NOT EXISTS star_rating numeric(3,1),
  ADD COLUMN IF NOT EXISTS review_count integer,
  ADD COLUMN IF NOT EXISTS autotrader_url text;

CREATE TABLE public.bdm_town_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  town text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, town)
);
GRANT SELECT, INSERT, DELETE ON public.bdm_town_access TO authenticated;
GRANT ALL ON public.bdm_town_access TO service_role;
ALTER TABLE public.bdm_town_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bdm_is_town_admin(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = _uid AND is_active AND role::text IN ('super_admin','admin'));
$$;

CREATE POLICY "Town access: admins manage, staff see own" ON public.bdm_town_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR bdm_is_town_admin(auth.uid()));
CREATE POLICY "Town access: admins grant" ON public.bdm_town_access FOR INSERT TO authenticated
  WITH CHECK (bdm_is_town_admin(auth.uid()) AND granted_by = auth.uid());
CREATE POLICY "Town access: admins revoke" ON public.bdm_town_access FOR DELETE TO authenticated
  USING (bdm_is_town_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.bdm_has_town(_uid uuid, _town text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _town IS NOT NULL AND bdm_is_staff(_uid) AND EXISTS (
    SELECT 1 FROM bdm_town_access WHERE user_id = _uid AND lower(town) = lower(_town));
$$;

CREATE OR REPLACE FUNCTION public.bdm_can_access(_dealership uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bdm_is_manager(auth.uid()) OR EXISTS (
    SELECT 1 FROM bdm_dealerships d WHERE d.id = _dealership AND bdm_is_staff(auth.uid())
      AND (d.assigned_bdm = auth.uid() OR d.created_by = auth.uid() OR bdm_has_town(auth.uid(), d.town)));
$$;

DROP POLICY IF EXISTS "BDM view dealerships" ON public.bdm_dealerships;
DROP POLICY IF EXISTS "BDM edit dealerships" ON public.bdm_dealerships;
CREATE POLICY "BDM view dealerships" ON public.bdm_dealerships FOR SELECT TO authenticated
  USING (bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid()) AND (assigned_bdm = auth.uid() OR created_by = auth.uid() OR bdm_has_town(auth.uid(), town))));
CREATE POLICY "BDM edit dealerships" ON public.bdm_dealerships FOR UPDATE TO authenticated
  USING (bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid()) AND (assigned_bdm = auth.uid() OR created_by = auth.uid() OR bdm_has_town(auth.uid(), town))))
  WITH CHECK (bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid()) AND (assigned_bdm = auth.uid() OR bdm_has_town(auth.uid(), town) OR (assigned_bdm IS NULL AND created_by = auth.uid()))));

CREATE OR REPLACE FUNCTION public.bdm_town_list() RETURNS TABLE(town text, dealerships bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.town, count(*) FROM bdm_dealerships d
  WHERE d.town IS NOT NULL AND (bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid()) AND (d.assigned_bdm = auth.uid() OR d.created_by = auth.uid() OR bdm_has_town(auth.uid(), d.town))))
  GROUP BY d.town ORDER BY d.town;
$$;
REVOKE EXECUTE ON FUNCTION public.bdm_town_list() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bdm_town_list() TO authenticated;