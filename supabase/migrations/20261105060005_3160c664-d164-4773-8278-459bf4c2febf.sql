CREATE OR REPLACE FUNCTION public.bdm_town_list() RETURNS TABLE(town text, dealerships bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); full_access boolean; staff boolean;
BEGIN
  full_access := bdm_is_town_admin(uid);
  staff := bdm_is_staff(uid);
  IF full_access THEN
    RETURN QUERY SELECT d.town, count(*) FROM bdm_dealerships d WHERE d.town IS NOT NULL GROUP BY d.town ORDER BY d.town;
  ELSIF staff THEN
    RETURN QUERY SELECT d.town, count(*) FROM bdm_dealerships d
      WHERE d.town IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM bdm_access_blocks b WHERE b.user_id = uid AND (b.dealership_id = d.id OR lower(b.town) = lower(d.town)))
        AND (d.assigned_bdm = uid OR d.created_by = uid
             OR EXISTS (SELECT 1 FROM bdm_town_access t WHERE t.user_id = uid AND lower(t.town) = lower(d.town)))
      GROUP BY d.town ORDER BY d.town;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.bdm_town_list() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bdm_town_list() TO authenticated;