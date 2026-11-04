CREATE TABLE public.website_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_plate text NOT NULL,
  email text,
  full_name text,
  reason text NOT NULL,
  feedback text,
  request_type text NOT NULL DEFAULT 'cancel',
  status text NOT NULL DEFAULT 'new',
  admin_note text,
  handled_at timestamptz,
  brand text NOT NULL DEFAULT 'pandaprotect',
  email_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.website_cancellation_requests TO authenticated;
GRANT ALL ON public.website_cancellation_requests TO service_role;
ALTER TABLE public.website_cancellation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view website cancellation requests" ON public.website_cancellation_requests FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update website cancellation requests" ON public.website_cancellation_requests FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.wcr_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER wcr_touch BEFORE UPDATE ON public.website_cancellation_requests FOR EACH ROW EXECUTE FUNCTION public.wcr_touch();