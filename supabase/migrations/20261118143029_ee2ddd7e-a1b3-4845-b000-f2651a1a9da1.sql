CREATE TABLE IF NOT EXISTS public.bdm_my_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  dealership_id uuid NOT NULL REFERENCES public.bdm_dealerships(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dealership_id)
);
GRANT SELECT, INSERT, DELETE ON public.bdm_my_contacts TO authenticated;
GRANT ALL ON public.bdm_my_contacts TO service_role;
ALTER TABLE public.bdm_my_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own my-contacts read" ON public.bdm_my_contacts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own my-contacts add" ON public.bdm_my_contacts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bdm_dealerships d WHERE d.id = dealership_id));
CREATE POLICY "Own my-contacts remove" ON public.bdm_my_contacts FOR DELETE TO authenticated USING (user_id = auth.uid());