CREATE TABLE public.bdm_note_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.bdm_dealerships(id) ON DELETE CASCADE,
  note text NOT NULL,
  assigned_to uuid NOT NULL,
  assigned_by uuid NOT NULL DEFAULT auth.uid(),
  assigned_by_name text,
  dealership_name text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bdm_note_assignments TO authenticated;
GRANT ALL ON public.bdm_note_assignments TO service_role;
ALTER TABLE public.bdm_note_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own note assignments" ON public.bdm_note_assignments FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid());
CREATE POLICY "Staff assign notes" ON public.bdm_note_assignments FOR INSERT TO authenticated
  WITH CHECK (assigned_by = auth.uid() AND public.bdm_is_staff(auth.uid()) AND public.bdm_is_staff(assigned_to) AND length(note) BETWEEN 1 AND 2000);
CREATE POLICY "Recipient marks read" ON public.bdm_note_assignments FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid()) WITH CHECK (assigned_to = auth.uid());
CREATE INDEX ON public.bdm_note_assignments (assigned_to, read_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.bdm_note_assignments;