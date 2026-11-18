DROP POLICY IF EXISTS "Dealers create own change requests" ON public.dealer_profile_change_requests;
CREATE POLICY "Dealers create own change requests" ON public.dealer_profile_change_requests
  FOR INSERT TO authenticated WITH CHECK (dealer_id = public.current_dealer_id() AND status = 'pending' AND field IN ('company_name','company_address'));

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
  IF NEW.address_line1 IS DISTINCT FROM OLD.address_line1
     OR NEW.address_line2 IS DISTINCT FROM OLD.address_line2
     OR NEW.city IS DISTINCT FROM OLD.city
     OR NEW.county IS DISTINCT FROM OLD.county
     OR NEW.postcode IS DISTINCT FROM OLD.postcode
     OR NEW.country_code IS DISTINCT FROM OLD.country_code THEN
    RAISE EXCEPTION 'Company address changes need Panda Protect approval.';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.review_dealer_profile_change(p_request_id uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.dealer_profile_change_requests; a jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM public.dealer_profile_change_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already reviewed'; END IF;
  IF p_approve AND r.field = 'company_name' THEN
    UPDATE public.dealers SET company_name = r.requested_value WHERE id = r.dealer_id;
  ELSIF p_approve AND r.field = 'company_address' THEN
    a := r.requested_value::jsonb;
    UPDATE public.dealers SET
      address_line1 = NULLIF(btrim(a->>'address1'),''),
      address_line2 = NULLIF(btrim(a->>'address2'),''),
      city = NULLIF(btrim(a->>'city'),''),
      county = NULLIF(btrim(a->>'county'),''),
      postcode = NULLIF(upper(btrim(a->>'postal_code')),''),
      country_code = COALESCE(NULLIF(a->>'country_code',''),'GB')
    WHERE id = r.dealer_id;
  END IF;
  UPDATE public.dealer_profile_change_requests
    SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
        admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_request_id;
END $$;