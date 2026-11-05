CREATE INDEX IF NOT EXISTS bdm_access_blocks_user_idx ON public.bdm_access_blocks(user_id);
CREATE INDEX IF NOT EXISTS bdm_town_access_user_idx ON public.bdm_town_access(user_id);

DROP POLICY "BDM view dealerships" ON public.bdm_dealerships;
CREATE POLICY "BDM view dealerships" ON public.bdm_dealerships FOR SELECT TO authenticated USING (
  (SELECT public.bdm_is_town_admin(auth.uid()))
  OR (
    NOT EXISTS (SELECT 1 FROM public.bdm_access_blocks b WHERE b.user_id = auth.uid()
      AND (b.dealership_id = bdm_dealerships.id OR lower(b.town) = lower(bdm_dealerships.town)))
    AND (
      (SELECT public.bdm_is_manager(auth.uid()))
      OR ((SELECT public.bdm_is_staff(auth.uid())) AND (
        assigned_bdm = auth.uid() OR created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.bdm_town_access t WHERE t.user_id = auth.uid() AND lower(t.town) = lower(bdm_dealerships.town))))
    )
  )
);

DROP POLICY "BDM edit dealerships" ON public.bdm_dealerships;
CREATE POLICY "BDM edit dealerships" ON public.bdm_dealerships FOR UPDATE TO authenticated USING (
  (SELECT public.bdm_is_town_admin(auth.uid()))
  OR (
    NOT EXISTS (SELECT 1 FROM public.bdm_access_blocks b WHERE b.user_id = auth.uid()
      AND (b.dealership_id = bdm_dealerships.id OR lower(b.town) = lower(bdm_dealerships.town)))
    AND (
      (SELECT public.bdm_is_manager(auth.uid()))
      OR ((SELECT public.bdm_is_staff(auth.uid())) AND (
        assigned_bdm = auth.uid() OR created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.bdm_town_access t WHERE t.user_id = auth.uid() AND lower(t.town) = lower(bdm_dealerships.town))))
    )
  )
);