CREATE OR REPLACE FUNCTION public.get_dealer_paylater_eligibility(p_dealer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.request_dealer_paylater(p_dealer_id uuid, p_requested_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s record;
  v_paid integer;
  v_overdue integer;
  v_mode text;
  v_request public.dealer_paylater_requests;
BEGIN
  IF p_requested_by IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.dealers WHERE id = p_dealer_id AND user_id = p_requested_by AND status = 'active'
  ) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT * INTO s FROM public.dealer_paylater_settings WHERE id = 1;
  SELECT mode INTO v_mode FROM public.dealer_paylater_overrides WHERE dealer_id = p_dealer_id;
  SELECT count(*) INTO v_paid FROM public.customers
    WHERE dealer_id = p_dealer_id AND brand = 'pandaprotect' AND payment_status = 'paid'
      AND coalesce(final_amount, 0) > 0 AND lower(coalesce(status, '')) NOT IN ('cancelled', 'refunded');
  SELECT count(*) INTO v_overdue FROM public.customers
    WHERE dealer_id = p_dealer_id AND brand = 'pandaprotect'
      AND (payment_status = 'overdue' OR (payment_status = 'invoice_pending'
        AND signup_date < now() - make_interval(days => s.payment_term_days)));
  IF v_mode = 'block' THEN RAISE EXCEPTION 'account billing is blocked for this dealership'; END IF;
  IF v_mode = 'allow' THEN RETURN jsonb_build_object('status', 'approved'); END IF;
  IF s.block_on_overdue AND v_overdue > 0 THEN RAISE EXCEPTION 'clear overdue invoices before requesting account billing'; END IF;
  IF v_paid < s.required_paid_warranties THEN RAISE EXCEPTION 'at least % paid warranties are required', s.required_paid_warranties; END IF;
  SELECT * INTO v_request FROM public.dealer_paylater_requests
    WHERE dealer_id = p_dealer_id AND status = 'pending' LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('status', 'pending', 'request_id', v_request.id); END IF;
  INSERT INTO public.dealer_paylater_requests (dealer_id, requested_by, paid_warranty_count)
  VALUES (p_dealer_id, p_requested_by, v_paid)
  RETURNING * INTO v_request;
  RETURN jsonb_build_object('status', 'pending', 'request_id', v_request.id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_dealer_paylater_request(p_request_id uuid, p_decision text, p_note text, p_reviewed_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.dealer_paylater_requests;
  s record;
  v_paid integer;
  v_overdue integer;
BEGIN
  IF NOT private.can_authorize_dealer_credit(p_reviewed_by) THEN RAISE EXCEPTION 'not allowed'; END IF;
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
      WHERE dealer_id = r.dealer_id AND brand = 'pandaprotect' AND payment_status = 'paid'
        AND coalesce(final_amount, 0) > 0 AND lower(coalesce(status, '')) NOT IN ('cancelled', 'refunded');
    SELECT count(*) INTO v_overdue FROM public.customers
      WHERE dealer_id = r.dealer_id AND brand = 'pandaprotect'
        AND (payment_status = 'overdue' OR (payment_status = 'invoice_pending'
          AND signup_date < now() - make_interval(days => s.payment_term_days)));
    IF v_paid < s.required_paid_warranties THEN RAISE EXCEPTION 'dealer no longer meets the paid warranty requirement'; END IF;
    IF s.block_on_overdue AND v_overdue > 0 THEN RAISE EXCEPTION 'dealer has overdue invoices'; END IF;
    INSERT INTO public.dealer_paylater_overrides (dealer_id, mode, note, updated_at)
    VALUES (r.dealer_id, 'allow', coalesce(p_note, 'Approved from credit authorisation request'), now())
    ON CONFLICT (dealer_id) DO UPDATE SET mode = 'allow', note = excluded.note, updated_at = now();
  END IF;
  UPDATE public.dealer_paylater_requests
  SET status = p_decision, review_note = p_note, reviewed_by = p_reviewed_by, reviewed_at = now(), updated_at = now()
  WHERE id = p_request_id;
  RETURN jsonb_build_object('status', p_decision, 'request_id', p_request_id, 'dealer_id', r.dealer_id);
END;
$function$;