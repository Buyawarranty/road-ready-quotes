CREATE TABLE public.dealer_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  cancellation_fee numeric,
  refund_amount numeric,
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dealer_cancellation_requests TO authenticated;
GRANT ALL ON public.dealer_cancellation_requests TO service_role;
ALTER TABLE public.dealer_cancellation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dealers view own cancellation requests" ON public.dealer_cancellation_requests FOR SELECT TO authenticated USING (dealer_id = public.current_dealer_id() OR public.is_admin(auth.uid()));
CREATE POLICY "Dealers request cancellation of own warranty" ON public.dealer_cancellation_requests FOR INSERT TO authenticated WITH CHECK (
  dealer_id = public.current_dealer_id() AND status = 'pending'
  AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.dealer_id = public.current_dealer_id()));
CREATE UNIQUE INDEX dealer_cancellation_one_pending ON public.dealer_cancellation_requests(customer_id) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.review_dealer_cancellation(p_request_id uuid, p_approve boolean, p_fee numeric, p_refund numeric, p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.dealer_cancellation_requests;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO r FROM public.dealer_cancellation_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;
  UPDATE public.dealer_cancellation_requests SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END,
    cancellation_fee = p_fee, refund_amount = p_refund, admin_note = p_note, reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_request_id;
  IF p_approve THEN
    UPDATE public.customers SET status = 'cancelled', updated_at = now(),
      cancellation_note = concat_ws(' | ', 'Dealer request: ' || r.reason, 'Fee £' || coalesce(p_fee,0), 'Refund £' || coalesce(p_refund,0), p_note),
      cancellation_note_updated_at = now()
    WHERE id = r.customer_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_dealer_cancellation(uuid, boolean, numeric, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.review_dealer_cancellation(uuid, boolean, numeric, numeric, text) TO authenticated;