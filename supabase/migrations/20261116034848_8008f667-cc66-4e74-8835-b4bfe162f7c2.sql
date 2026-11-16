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
  SELECT count(*) INTO v_intro_used FROM public.dealer_intro_free_redemptions WHERE dealer_id = p_dealer_id AND status <> 'rejected';
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