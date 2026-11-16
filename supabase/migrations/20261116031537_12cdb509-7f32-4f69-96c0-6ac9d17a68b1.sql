CREATE OR REPLACE FUNCTION public.can_authorize_dealer_credit(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_authorize_dealer_credit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_authorize_dealer_credit(uuid) TO authenticated;

CREATE TABLE public.dealer_paylater_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  paid_warranty_count integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX dealer_paylater_one_pending ON public.dealer_paylater_requests(dealer_id) WHERE status = 'pending';
GRANT SELECT ON public.dealer_paylater_requests TO authenticated;
GRANT ALL ON public.dealer_paylater_requests TO service_role;
ALTER TABLE public.dealer_paylater_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dealers view own credit requests and approvers view all" ON public.dealer_paylater_requests
  FOR SELECT TO authenticated
  USING (dealer_id = public.current_dealer_id() OR public.can_authorize_dealer_credit(auth.uid()));
CREATE TRIGGER update_dealer_paylater_requests_updated_at BEFORE UPDATE ON public.dealer_paylater_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dealer_trade_terms_acceptances (
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted_by uuid NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dealer_id, terms_version)
);
GRANT SELECT ON public.dealer_trade_terms_acceptances TO authenticated;
GRANT ALL ON public.dealer_trade_terms_acceptances TO service_role;
ALTER TABLE public.dealer_trade_terms_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dealers view own terms acceptance and approvers view all" ON public.dealer_trade_terms_acceptances
  FOR SELECT TO authenticated
  USING (dealer_id = public.current_dealer_id() OR public.can_authorize_dealer_credit(auth.uid()));
CREATE TRIGGER update_dealer_trade_terms_acceptances_updated_at BEFORE UPDATE ON public.dealer_trade_terms_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dealer_intro_free_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  slot integer NOT NULL CHECK (slot BETWEEN 1 AND 3),
  duration_months integer NOT NULL CHECK (duration_months BETWEEN 1 AND 36),
  original_amount numeric NOT NULL CHECK (original_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dealer_id, slot),
  UNIQUE (customer_id)
);
GRANT SELECT ON public.dealer_intro_free_redemptions TO authenticated;
GRANT ALL ON public.dealer_intro_free_redemptions TO service_role;
ALTER TABLE public.dealer_intro_free_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dealers view own introductory offer use and approvers view all" ON public.dealer_intro_free_redemptions
  FOR SELECT TO authenticated
  USING (dealer_id = public.current_dealer_id() OR public.can_authorize_dealer_credit(auth.uid()));
CREATE TRIGGER update_dealer_intro_free_redemptions_updated_at BEFORE UPDATE ON public.dealer_intro_free_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

UPDATE public.dealer_paylater_settings
SET unlock_rule = 'paid_warranties', required_paid_warranties = 10, payment_term_days = 30, updated_at = now()
WHERE id = 1;

CREATE OR REPLACE FUNCTION public.accept_dealer_trade_terms(p_dealer_id uuid, p_terms_version text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_dealer_id <> public.current_dealer_id() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF p_terms_version <> '2026-11-15-v1' THEN
    RAISE EXCEPTION 'unknown terms version';
  END IF;
  INSERT INTO public.dealer_trade_terms_acceptances (dealer_id, terms_version, accepted_by)
  VALUES (p_dealer_id, p_terms_version, auth.uid())
  ON CONFLICT (dealer_id, terms_version) DO NOTHING;
  RETURN jsonb_build_object('accepted', true, 'terms_version', p_terms_version);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.accept_dealer_trade_terms(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_dealer_trade_terms(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_dealer_paylater(p_dealer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  v_paid integer;
  v_overdue integer;
  v_mode text;
  v_request public.dealer_paylater_requests;
BEGIN
  IF auth.uid() IS NULL OR p_dealer_id <> public.current_dealer_id() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dealers WHERE id = p_dealer_id AND status = 'active') THEN
    RAISE EXCEPTION 'dealer account is not active';
  END IF;
  SELECT * INTO s FROM public.dealer_paylater_settings WHERE id = 1;
  SELECT mode INTO v_mode FROM public.dealer_paylater_overrides WHERE dealer_id = p_dealer_id;
  SELECT count(*) INTO v_paid FROM public.customers
    WHERE dealer_id = p_dealer_id AND payment_status = 'paid' AND coalesce(final_amount, 0) > 0;
  SELECT count(*) INTO v_overdue FROM public.customers
    WHERE dealer_id = p_dealer_id AND payment_status = 'invoice_pending'
      AND signup_date < now() - make_interval(days => s.payment_term_days);
  IF v_mode = 'block' THEN RAISE EXCEPTION 'account billing is blocked for this dealership'; END IF;
  IF v_mode = 'allow' THEN RETURN jsonb_build_object('status', 'approved'); END IF;
  IF s.block_on_overdue AND v_overdue > 0 THEN RAISE EXCEPTION 'clear overdue invoices before requesting account billing'; END IF;
  IF v_paid < s.required_paid_warranties THEN
    RAISE EXCEPTION 'at least % paid warranties are required', s.required_paid_warranties;
  END IF;
  SELECT * INTO v_request FROM public.dealer_paylater_requests
    WHERE dealer_id = p_dealer_id AND status = 'pending' LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('status', 'pending', 'request_id', v_request.id); END IF;
  INSERT INTO public.dealer_paylater_requests (dealer_id, requested_by, paid_warranty_count)
  VALUES (p_dealer_id, auth.uid(), v_paid)
  RETURNING * INTO v_request;
  RETURN jsonb_build_object('status', 'pending', 'request_id', v_request.id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.request_dealer_paylater(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_dealer_paylater(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_dealer_paylater_request(p_request_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.dealer_paylater_requests;
  s record;
  v_paid integer;
  v_overdue integer;
BEGIN
  IF NOT public.can_authorize_dealer_credit(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'invalid decision'; END IF;
  SELECT * INTO r FROM public.dealer_paylater_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'request has already been reviewed'; END IF;
  IF p_decision = 'approved' THEN
    IF NOT EXISTS (SELECT 1 FROM public.dealers WHERE id = r.dealer_id AND status = 'active') THEN
      RAISE EXCEPTION 'dealer account is not active';
    END IF;
    SELECT * INTO s FROM public.dealer_paylater_settings WHERE id = 1;
    SELECT count(*) INTO v_paid FROM public.customers
      WHERE dealer_id = r.dealer_id AND payment_status = 'paid' AND coalesce(final_amount, 0) > 0;
    SELECT count(*) INTO v_overdue FROM public.customers
      WHERE dealer_id = r.dealer_id AND payment_status = 'invoice_pending'
        AND signup_date < now() - make_interval(days => s.payment_term_days);
    IF v_paid < s.required_paid_warranties THEN RAISE EXCEPTION 'dealer no longer meets the paid warranty requirement'; END IF;
    IF s.block_on_overdue AND v_overdue > 0 THEN RAISE EXCEPTION 'dealer has overdue invoices'; END IF;
    INSERT INTO public.dealer_paylater_overrides (dealer_id, mode, note, updated_at)
    VALUES (r.dealer_id, 'allow', coalesce(p_note, 'Approved from credit authorisation request'), now())
    ON CONFLICT (dealer_id) DO UPDATE SET mode = 'allow', note = excluded.note, updated_at = now();
  END IF;
  UPDATE public.dealer_paylater_requests
  SET status = p_decision, review_note = p_note, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_request_id;
  RETURN jsonb_build_object('status', p_decision, 'request_id', p_request_id, 'dealer_id', r.dealer_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_dealer_paylater_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_dealer_paylater_request(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_dealer_intro_free(p_dealer_id uuid, p_customer_id uuid, p_duration_months integer, p_original_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid integer;
  v_used integer;
  v_slot integer;
BEGIN
  IF p_duration_months < 1 OR p_duration_months > 36 THEN RAISE EXCEPTION 'introductory cover is limited to three years'; END IF;
  IF p_original_amount < 0 THEN RAISE EXCEPTION 'invalid original amount'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_dealer_id::text, 0));
  SELECT count(*) INTO v_paid FROM public.customers
    WHERE dealer_id = p_dealer_id AND payment_status = 'paid' AND coalesce(final_amount, 0) > 0;
  IF v_paid < 3 THEN RAISE EXCEPTION 'three paid warranties are required'; END IF;
  SELECT count(*) INTO v_used FROM public.dealer_intro_free_redemptions WHERE dealer_id = p_dealer_id;
  IF v_used >= 3 THEN RAISE EXCEPTION 'introductory free warranties have been used'; END IF;
  v_slot := v_used + 1;
  INSERT INTO public.dealer_intro_free_redemptions (dealer_id, customer_id, slot, duration_months, original_amount)
  VALUES (p_dealer_id, p_customer_id, v_slot, p_duration_months, p_original_amount);
  RETURN jsonb_build_object('slot', v_slot, 'remaining', 3 - v_slot);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_dealer_intro_free(uuid, uuid, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_dealer_intro_free(uuid, uuid, integer, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.get_dealer_paylater_eligibility(p_dealer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  v_mode text;
  v_paid integer;
  v_overdue integer;
  v_reason text := null;
  v_request_status text;
  v_intro_used integer;
  v_intro_remaining integer := 0;
BEGIN
  IF NOT (public.can_authorize_dealer_credit(auth.uid()) OR p_dealer_id = public.current_dealer_id()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  SELECT * INTO s FROM public.dealer_paylater_settings WHERE id = 1;
  SELECT mode INTO v_mode FROM public.dealer_paylater_overrides WHERE dealer_id = p_dealer_id;
  SELECT count(*) INTO v_paid FROM public.customers
    WHERE dealer_id = p_dealer_id AND payment_status = 'paid' AND coalesce(final_amount, 0) > 0;
  SELECT count(*) INTO v_overdue FROM public.customers
    WHERE dealer_id = p_dealer_id AND payment_status = 'invoice_pending'
      AND signup_date < now() - make_interval(days => s.payment_term_days);
  SELECT status INTO v_request_status FROM public.dealer_paylater_requests
    WHERE dealer_id = p_dealer_id ORDER BY created_at DESC LIMIT 1;
  SELECT count(*) INTO v_intro_used FROM public.dealer_intro_free_redemptions WHERE dealer_id = p_dealer_id;
  IF v_paid >= 3 THEN v_intro_remaining := greatest(0, 3 - v_intro_used); END IF;
  IF s.block_on_overdue AND v_overdue > 0 THEN v_reason := 'overdue';
  ELSIF v_mode = 'block' THEN v_reason := 'blocked';
  ELSIF v_mode = 'allow' THEN v_reason := null;
  ELSIF v_paid < s.required_paid_warranties THEN v_reason := 'new';
  ELSIF v_request_status = 'pending' THEN v_reason := 'pending';
  ELSE v_reason := 'approval_required';
  END IF;
  RETURN jsonb_build_object(
    'eligible', v_reason IS NULL,
    'reason', v_reason,
    'paid_count', v_paid,
    'required', s.required_paid_warranties,
    'term_days', s.payment_term_days,
    'overdue_count', v_overdue,
    'mode', coalesce(v_mode, 'auto'),
    'request_status', v_request_status,
    'can_request', v_mode IS DISTINCT FROM 'allow' AND v_mode IS DISTINCT FROM 'block'
      AND v_paid >= s.required_paid_warranties AND v_request_status IS DISTINCT FROM 'pending'
      AND NOT (s.block_on_overdue AND v_overdue > 0),
    'intro_free_remaining', v_intro_remaining,
    'intro_free_used', v_intro_used
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_dealer_paylater_eligibility(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dealer_paylater_eligibility(uuid) TO authenticated;
