CREATE TABLE public.partner_guide_update_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  guide_version text NOT NULL,
  summary text NOT NULL,
  sent_to text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  error text,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_guide_update_emails TO authenticated;
GRANT ALL ON public.partner_guide_update_emails TO service_role;
ALTER TABLE public.partner_guide_update_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read partner update emails" ON public.partner_guide_update_emails FOR SELECT TO authenticated
USING (public.bdm_is_town_admin(auth.uid()));
CREATE INDEX ON public.partner_guide_update_emails (partner_id, created_at DESC);