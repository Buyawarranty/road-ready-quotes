CREATE TABLE public.dealer_bogof_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  banner_title text NOT NULL DEFAULT 'Buy one, get the next one free',
  banner_text text NOT NULL DEFAULT 'Every paid warranty earns your next warranty free (up to 3 years'' cover).',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.dealer_bogof_settings (id) VALUES (1);
GRANT SELECT ON public.dealer_bogof_settings TO anon, authenticated;
GRANT UPDATE ON public.dealer_bogof_settings TO authenticated;
GRANT ALL ON public.dealer_bogof_settings TO service_role;
ALTER TABLE public.dealer_bogof_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read the offer banner" ON public.dealer_bogof_settings FOR SELECT USING (true);
CREATE POLICY "Super Admin updates the offer" ON public.dealer_bogof_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE OR REPLACE FUNCTION public.dealer_bogof_remaining(p_dealer_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT coalesce((SELECT enabled FROM public.dealer_bogof_settings WHERE id = 1), false) THEN 0
  ELSE greatest(0,
    (SELECT count(*) FROM public.customers WHERE dealer_id = p_dealer_id AND payment_status = 'paid'
       AND coalesce(final_amount,0) > 0 AND lower(coalesce(status,'')) NOT IN ('cancelled','refunded'))::int
    - (SELECT count(*) FROM public.dealer_intro_free_redemptions WHERE dealer_id = p_dealer_id AND status <> 'rejected')::int)
  END
$$;
REVOKE EXECUTE ON FUNCTION public.dealer_bogof_remaining(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dealer_bogof_remaining(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_dealer_intro_free(p_dealer_id uuid, p_customer_id uuid, p_duration_months integer, p_original_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slot integer;
BEGIN
  IF p_duration_months < 1 OR p_duration_months > 36 THEN RAISE EXCEPTION 'free cover is limited to three years'; END IF;
  IF p_original_amount < 0 THEN RAISE EXCEPTION 'invalid original amount'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_dealer_id::text, 0));
  IF public.dealer_bogof_remaining(p_dealer_id) < 1 THEN RAISE EXCEPTION 'no free warranty available'; END IF;
  SELECT coalesce(max(slot),0) + 1 INTO v_slot FROM public.dealer_intro_free_redemptions WHERE dealer_id = p_dealer_id;
  INSERT INTO public.dealer_intro_free_redemptions (dealer_id, customer_id, slot, duration_months, original_amount, status, reviewed_at, review_note)
  VALUES (p_dealer_id, p_customer_id, v_slot, p_duration_months, p_original_amount, 'approved', now(), 'Buy one get one free — automatic');
  RETURN jsonb_build_object('slot', v_slot);
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_dealer_intro_free(uuid, uuid, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_dealer_intro_free(uuid, uuid, integer, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.get_dealer_paylater_eligibility(p_dealer_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s record; v_mode text; v_paid integer; v_overdue integer; v_reason text := null;
  v_request_status text; v_intro_used integer; v_intro_remaining integer := 0;
BEGIN
  IF NOT (private.can_authorize_dealer_credit(auth.uid()) OR p_dealer_id = public.current_dealer_id()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  SELECT * INTO s FROM public.dealer_paylater_settings WHERE id = 1;
  SELECT mode INTO v_mode FROM public.dealer_paylater_overrides WHERE dealer_id = p_dealer_id;
  SELECT count(*) INTO v_paid FROM public.customers
    WHERE dealer_id = p_dealer_id AND brand = 'pandaprotect' AND payment_status = 'paid'
      AND coalesce(final_amount, 0) > 0 AND lower(coalesce(status, '')) NOT IN ('cancelled', 'refunded');
  SELECT count(*) INTO v_overdue FROM public.customers
    WHERE dealer_id = p_dealer_id AND brand = 'pandaprotect'
      AND (payment_status = 'overdue' OR (payment_status = 'invoice_pending'
        AND signup_date < now() - make_interval(days => s.payment_term_days)));
  SELECT status INTO v_request_status FROM public.dealer_paylater_requests
    WHERE dealer_id = p_dealer_id ORDER BY created_at DESC LIMIT 1;
  SELECT count(*) INTO v_intro_used FROM public.dealer_intro_free_redemptions WHERE dealer_id = p_dealer_id AND status <> 'rejected';
  v_intro_remaining := public.dealer_bogof_remaining(p_dealer_id);
  IF s.block_on_overdue AND v_overdue > 0 THEN v_reason := 'overdue';
  ELSIF v_mode = 'block' THEN v_reason := 'blocked';
  ELSIF v_mode = 'allow' THEN v_reason := null;
  ELSIF v_paid < s.required_paid_warranties THEN v_reason := 'new';
  ELSIF v_request_status = 'pending' THEN v_reason := 'pending';
  ELSE v_reason := 'approval_required';
  END IF;
  RETURN jsonb_build_object(
    'eligible', v_reason IS NULL, 'reason', v_reason, 'paid_count', v_paid,
    'required', s.required_paid_warranties, 'term_days', s.payment_term_days,
    'overdue_count', v_overdue, 'mode', coalesce(v_mode, 'auto'), 'request_status', v_request_status,
    'can_request', v_mode IS DISTINCT FROM 'allow' AND v_mode IS DISTINCT FROM 'block'
      AND v_paid >= s.required_paid_warranties AND v_request_status IS DISTINCT FROM 'pending'
      AND NOT (s.block_on_overdue AND v_overdue > 0),
    'intro_free_remaining', v_intro_remaining, 'intro_free_used', v_intro_used
  );
END;
$function$;