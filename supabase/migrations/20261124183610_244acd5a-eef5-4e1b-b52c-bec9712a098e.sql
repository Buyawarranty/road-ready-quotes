CREATE OR REPLACE FUNCTION public.complete_dealer_sale(
  p_customer_id uuid,
  p_dealer_quote_id uuid DEFAULT NULL,
  p_stripe_session_id text DEFAULT NULL,
  p_quote_status text DEFAULT 'paid'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer record;
  v_quote_dealer_id uuid;
  v_months integer;
  v_start date;
  v_warranty_id uuid;
BEGIN
  IF p_quote_status NOT IN ('paid', 'invoiced', 'completed') THEN
    RAISE EXCEPTION 'Invalid dealer quote completion status';
  END IF;
  SELECT id, dealer_id, name, registration_plate, signup_date, payment_type, status
  INTO v_customer FROM public.customers
  WHERE id = p_customer_id AND dealer_id IS NOT NULL AND brand = 'pandaprotect';
  IF NOT FOUND THEN RAISE EXCEPTION 'Panda dealer sale not found'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_customer_id::text));
  IF p_dealer_quote_id IS NOT NULL THEN
    SELECT dealer_id INTO v_quote_dealer_id FROM public.dealer_quotes
    WHERE id = p_dealer_quote_id FOR UPDATE;
    IF NOT FOUND OR v_quote_dealer_id <> v_customer.dealer_id THEN
      RAISE EXCEPTION 'Dealer quote does not belong to this sale';
    END IF;
    IF EXISTS (SELECT 1 FROM public.dealer_warranties
      WHERE quote_id = p_dealer_quote_id AND customer_id IS DISTINCT FROM p_customer_id) THEN
      RAISE EXCEPTION 'This quote already belongs to an issued warranty. Start a new quote for another sale.';
    END IF;
    UPDATE public.dealer_quotes
    SET status = p_quote_status,
        current_step = 5,
        stripe_session_id = COALESCE(p_stripe_session_id, stripe_session_id),
        paid_at = CASE WHEN p_quote_status = 'paid' THEN COALESCE(paid_at, now()) ELSE paid_at END,
        updated_at = now()
    WHERE id = p_dealer_quote_id
      AND paid_at IS NULL
      AND (lower(status) IN ('draft', 'pending', 'quoted', 'awaiting_panda')
        OR (lower(status) = 'invoiced' AND p_quote_status = 'paid'));
  END IF;
  v_months := COALESCE(NULLIF(regexp_replace(COALESCE(v_customer.payment_type, ''), '[^0-9]', '', 'g'), '')::integer, 12);
  v_start := COALESCE(v_customer.signup_date::date, CURRENT_DATE);
  INSERT INTO public.dealer_warranties (
    quote_id, customer_id, dealer_id, customer_name, vehicle_reg, start_date, end_date, status
  ) VALUES (
    p_dealer_quote_id, v_customer.id, v_customer.dealer_id, v_customer.name,
    v_customer.registration_plate, v_start, v_start + make_interval(months => v_months),
    lower(COALESCE(v_customer.status, 'active'))
  ) ON CONFLICT (customer_id) WHERE customer_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_warranty_id;
  IF v_warranty_id IS NULL THEN
    SELECT id INTO v_warranty_id FROM public.dealer_warranties WHERE customer_id = p_customer_id;
  END IF;
  RETURN jsonb_build_object('customer_id', p_customer_id, 'dealer_quote_id', p_dealer_quote_id, 'dealer_warranty_id', v_warranty_id);
END;
$$;
-- Existing service-only grants are preserved by CREATE OR REPLACE. No data backfill.