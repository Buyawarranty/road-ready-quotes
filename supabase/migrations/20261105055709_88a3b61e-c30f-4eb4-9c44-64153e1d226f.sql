-- BDM visibility: a manager only ever sees (and counts) the leads they have been given.
-- Super Admin / Admin keep the full list; everyone else is limited to granted towns,
-- their own assigned/created leads, minus anything blocked for them.

CREATE OR REPLACE FUNCTION public.bdm_can_access(_dealership uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM bdm_dealerships d
    WHERE d.id = _dealership
      AND (bdm_is_town_admin(auth.uid())
        OR (NOT bdm_is_blocked(auth.uid(), d.id, d.town)
            AND bdm_is_staff(auth.uid())
            AND (d.assigned_bdm = auth.uid() OR d.created_by = auth.uid() OR bdm_has_town(auth.uid(), d.town)))));
$$;

DROP POLICY "BDM view dealerships" ON public.bdm_dealerships;
CREATE POLICY "BDM view dealerships" ON public.bdm_dealerships FOR SELECT TO authenticated USING (
  (SELECT public.bdm_is_town_admin(auth.uid()))
  OR (
    (SELECT public.bdm_is_staff(auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.bdm_access_blocks b WHERE b.user_id = auth.uid()
      AND (b.dealership_id = bdm_dealerships.id OR lower(b.town) = lower(bdm_dealerships.town)))
    AND (
      assigned_bdm = auth.uid() OR created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.bdm_town_access t WHERE t.user_id = auth.uid() AND lower(t.town) = lower(bdm_dealerships.town))
    )
  )
);

DROP POLICY "BDM edit dealerships" ON public.bdm_dealerships;
CREATE POLICY "BDM edit dealerships" ON public.bdm_dealerships FOR UPDATE TO authenticated USING (
  (SELECT public.bdm_is_town_admin(auth.uid()))
  OR (
    (SELECT public.bdm_is_staff(auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.bdm_access_blocks b WHERE b.user_id = auth.uid()
      AND (b.dealership_id = bdm_dealerships.id OR lower(b.town) = lower(bdm_dealerships.town)))
    AND (
      assigned_bdm = auth.uid() OR created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.bdm_town_access t WHERE t.user_id = auth.uid() AND lower(t.town) = lower(bdm_dealerships.town))
    )
  )
) WITH CHECK (
  (SELECT public.bdm_is_town_admin(auth.uid()))
  OR (
    (SELECT public.bdm_is_staff(auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.bdm_access_blocks b WHERE b.user_id = auth.uid()
      AND (b.dealership_id = bdm_dealerships.id OR lower(b.town) = lower(bdm_dealerships.town)))
    AND (
      assigned_bdm = auth.uid() OR created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.bdm_town_access t WHERE t.user_id = auth.uid() AND lower(t.town) = lower(bdm_dealerships.town))
    )
  )
);

-- Town picker counts must be counted through the same row rules, so a manager's
-- per-town numbers can never exceed the leads they are allowed to contact.
CREATE OR REPLACE FUNCTION public.bdm_town_list() RETURNS TABLE(town text, dealerships bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT d.town, count(*) FROM bdm_dealerships d
  WHERE d.town IS NOT NULL
  GROUP BY d.town ORDER BY d.town;
$$;
REVOKE EXECUTE ON FUNCTION public.bdm_town_list() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bdm_town_list() TO authenticated;

-- Legacy KPI rollup follows the same scope (granted towns + own leads), not a blanket manager pass.
CREATE OR REPLACE FUNCTION public.bdm_kpis() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH v AS (
    SELECT * FROM bdm_dealerships d
    WHERE bdm_is_town_admin(auth.uid())
       OR (bdm_is_staff(auth.uid()) AND (d.assigned_bdm = auth.uid() OR d.created_by = auth.uid() OR bdm_has_town(auth.uid(), d.town)))
  ), b AS (SELECT (date_trunc('day', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London') AS today)
  SELECT jsonb_build_object(
    'due_today', (SELECT count(DISTINCT t.dealership_id) FROM bdm_tasks t JOIN v ON v.id = t.dealership_id, b WHERE t.status='open' AND NOT v.do_not_contact AND t.due_at >= b.today AND t.due_at < b.today + interval '1 day'),
    'overdue', (SELECT count(DISTINCT t.dealership_id) FROM bdm_tasks t JOIN v ON v.id = t.dealership_id, b WHERE t.status='open' AND NOT v.do_not_contact AND t.due_at < b.today),
    'interested', (SELECT count(*) FROM v WHERE stage = 'interested'),
    'onboarding', (SELECT count(*) FROM v WHERE stage = 'onboarding'),
    'activated', (SELECT count(*) FROM v WHERE v.dealer_id IS NOT NULL AND (
        SELECT min(c.created_at) FROM customers c WHERE c.dealer_id = v.dealer_id AND coalesce(c.status,'') NOT ILIKE 'cancel%') >= date_trunc('month', now()))
  ) WHERE bdm_is_staff(auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.bdm_kpis() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bdm_kpis() TO authenticated;