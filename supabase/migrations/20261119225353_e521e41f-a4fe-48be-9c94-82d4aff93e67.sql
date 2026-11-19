CREATE OR REPLACE FUNCTION public.review_dealer_cancellation(p_request_id uuid, p_approve boolean, p_fee numeric, p_refund numeric, p_note text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.dealer_cancellation_requests;
BEGIN
  IF NOT public.can_process_dealer_cancellations(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF p_approve AND (p_fee < 0 OR p_refund < 0) THEN RAISE EXCEPTION 'Fee and refund must be zero or more'; END IF;
  SELECT * INTO r FROM public.dealer_cancellation_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;
  UPDATE public.dealer_cancellation_requests SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END,
    cancellation_fee = CASE WHEN p_approve THEN p_fee ELSE NULL END,
    refund_amount = CASE WHEN p_approve THEN p_refund ELSE NULL END,
    admin_note = p_note, reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_request_id;
  IF p_approve THEN
    UPDATE public.customers SET status = 'Cancelled', updated_at = now(),
      cancellation_note = concat_ws(' | ', 'Dealer request: ' || r.reason, 'Fee £' || coalesce(p_fee,0), 'Refund £' || coalesce(p_refund,0), p_note),
      cancellation_note_updated_at = now()
    WHERE id = r.customer_id;
  END IF;
END
$function$;