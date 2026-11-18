CREATE OR REPLACE FUNCTION public.can_process_dealer_cancellations(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text IN ('admin', 'super_admin', 'accounts', 'accounts_manager')
      AND (
        NOT EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = ur.user_id)
        OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = ur.user_id AND au.is_active = true)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_process_dealer_cancellations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_process_dealer_cancellations(uuid) TO authenticated, service_role;

CREATE POLICY "Cancellation reviewers view dealer requests"
ON public.dealer_cancellation_requests
FOR SELECT
TO authenticated
USING (public.can_process_dealer_cancellations(auth.uid()));

CREATE OR REPLACE FUNCTION public.review_dealer_cancellation(p_request_id uuid, p_approve boolean, p_fee numeric, p_refund numeric, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE r public.dealer_cancellation_requests;
BEGIN
  IF NOT public.can_process_dealer_cancellations(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF p_approve AND (p_fee < 0 OR p_refund < 0) THEN
    RAISE EXCEPTION 'Fee and refund must be zero or more';
  END IF;
  SELECT * INTO r FROM public.dealer_cancellation_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;
  UPDATE public.dealer_cancellation_requests SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END,
    cancellation_fee = CASE WHEN p_approve THEN p_fee ELSE NULL END,
    refund_amount = CASE WHEN p_approve THEN p_refund ELSE NULL END,
    admin_note = p_note, reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_request_id;
  IF p_approve THEN
    UPDATE public.customers SET status = 'cancelled', updated_at = now(),
      cancellation_note = concat_ws(' | ', 'Dealer request: ' || r.reason, 'Fee £' || coalesce(p_fee,0), 'Refund £' || coalesce(p_refund,0), p_note),
      cancellation_note_updated_at = now()
    WHERE id = r.customer_id;
  END IF;
END
$function$;

REVOKE ALL ON FUNCTION public.review_dealer_cancellation(uuid, boolean, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_dealer_cancellation(uuid, boolean, numeric, numeric, text) TO authenticated;