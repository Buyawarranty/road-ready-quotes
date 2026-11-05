CREATE TABLE public.bdm_access_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dealership_id uuid REFERENCES public.bdm_dealerships(id) ON DELETE CASCADE,
  town text,
  reason text,
  blocked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bdm_block_target CHECK ((dealership_id IS NOT NULL) <> (town IS NOT NULL))
);
CREATE UNIQUE INDEX bdm_access_blocks_uniq ON public.bdm_access_blocks (user_id, coalesce(dealership_id::text, lower(town)));
GRANT SELECT, INSERT, DELETE ON public.bdm_access_blocks TO authenticated;
GRANT ALL ON public.bdm_access_blocks TO service_role;
ALTER TABLE public.bdm_access_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blocks: admins and self view" ON public.bdm_access_blocks FOR SELECT TO authenticated USING (user_id = auth.uid() OR bdm_is_town_admin(auth.uid()));
CREATE POLICY "Blocks: admins add" ON public.bdm_access_blocks FOR INSERT TO authenticated WITH CHECK (bdm_is_town_admin(auth.uid()) AND NOT bdm_is_super(user_id));
CREATE POLICY "Blocks: admins remove" ON public.bdm_access_blocks FOR DELETE TO authenticated USING (bdm_is_town_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.bdm_is_blocked(_uid uuid, _dealership uuid, _town text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT NOT bdm_is_super(_uid) AND EXISTS (
    SELECT 1 FROM bdm_access_blocks b WHERE b.user_id = _uid
      AND (b.dealership_id = _dealership OR (_town IS NOT NULL AND lower(b.town) = lower(_town))));
$$;

CREATE OR REPLACE FUNCTION public.bdm_can_access(_dealership uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM bdm_dealerships d WHERE d.id = _dealership
      AND NOT bdm_is_blocked(auth.uid(), d.id, d.town)
      AND (bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid())
        AND (d.assigned_bdm = auth.uid() OR d.created_by = auth.uid() OR bdm_has_town(auth.uid(), d.town)))));
$$;

DROP POLICY "BDM view dealerships" ON public.bdm_dealerships;
CREATE POLICY "BDM view dealerships" ON public.bdm_dealerships FOR SELECT TO authenticated USING (
  NOT bdm_is_blocked(auth.uid(), id, town) AND (bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid()) AND (assigned_bdm = auth.uid() OR created_by = auth.uid() OR bdm_has_town(auth.uid(), town)))));
DROP POLICY "BDM edit dealerships" ON public.bdm_dealerships;
CREATE POLICY "BDM edit dealerships" ON public.bdm_dealerships FOR UPDATE TO authenticated USING (
  NOT bdm_is_blocked(auth.uid(), id, town) AND (bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid()) AND (assigned_bdm = auth.uid() OR created_by = auth.uid() OR bdm_has_town(auth.uid(), town)))));