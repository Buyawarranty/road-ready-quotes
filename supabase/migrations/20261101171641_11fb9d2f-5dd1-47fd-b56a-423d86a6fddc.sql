CREATE TABLE public.dealer_profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  field text NOT NULL DEFAULT 'company_name',
  current_value text,
  requested_value text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dealer_profile_change_requests TO authenticated;
GRANT UPDATE ON public.dealer_profile_change_requests TO authenticated;
GRANT ALL ON public.dealer_profile_change_requests TO service_role;
ALTER TABLE public.dealer_profile_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers view own change requests" ON public.dealer_profile_change_requests
  FOR SELECT TO authenticated USING (dealer_id = public.current_dealer_id() OR public.is_admin(auth.uid()));
CREATE POLICY "Dealers create own change requests" ON public.dealer_profile_change_requests
  FOR INSERT TO authenticated WITH CHECK (dealer_id = public.current_dealer_id() AND status = 'pending' AND field = 'company_name');
CREATE POLICY "Admins manage change requests" ON public.dealer_profile_change_requests
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE UNIQUE INDEX dealer_profile_change_one_pending ON public.dealer_profile_change_requests(dealer_id, field) WHERE status = 'pending';

-- Dealers may only change phone and billing address on their own record.
CREATE OR REPLACE FUNCTION public.guard_dealer_locked_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) OR current_setting('app.dealer_change_approved', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.company_name IS DISTINCT FROM OLD.company_name
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.discount_pct IS DISTINCT FROM OLD.discount_pct
     OR NEW.commission_tier IS DISTINCT FROM OLD.commission_tier
     OR NEW.finance_limit IS DISTINCT FROM OLD.finance_limit
     OR NEW.fca_number IS DISTINCT FROM OLD.fca_number THEN
    RAISE EXCEPTION 'Company name and account email need Panda Protect approval to change.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_dealer_locked_fields BEFORE UPDATE ON public.dealers
  FOR EACH ROW EXECUTE FUNCTION public.guard_dealer_locked_fields();

CREATE OR REPLACE FUNCTION public.review_dealer_profile_change(p_request_id uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.dealer_profile_change_requests;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM public.dealer_profile_change_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already reviewed'; END IF;
  IF p_approve AND r.field = 'company_name' THEN
    UPDATE public.dealers SET company_name = r.requested_value WHERE id = r.dealer_id;
  END IF;
  UPDATE public.dealer_profile_change_requests
    SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
        admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_request_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.review_dealer_profile_change(uuid, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_dealer_profile_change(uuid, boolean, text) TO authenticated;