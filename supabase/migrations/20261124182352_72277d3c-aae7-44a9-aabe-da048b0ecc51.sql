DO $$
DECLARE v_customer jsonb; v_warranty jsonb; v_quotes jsonb; v_policy uuid;
BEGIN
  SELECT to_jsonb(c) INTO v_customer FROM public.customers c WHERE id='994104ec-5531-4364-90c4-9f99df634faa';
  SELECT to_jsonb(w) INTO v_warranty FROM public.dealer_warranties w WHERE customer_id='994104ec-5531-4364-90c4-9f99df634faa';
  SELECT jsonb_agg(to_jsonb(q) ORDER BY q.id) INTO v_quotes FROM public.dealer_quotes q WHERE q.id IN (SELECT quote_id FROM public.dealer_warranties WHERE customer_id='994104ec-5531-4364-90c4-9f99df634faa');
  v_policy := public.ensure_dealer_customer_portal_policy('994104ec-5531-4364-90c4-9f99df634faa');
  IF v_policy IS NULL THEN RAISE EXCEPTION 'Eligible issued warranty must gain portal details'; END IF;
  IF (SELECT count(*) FROM public.customer_policies WHERE customer_id='994104ec-5531-4364-90c4-9f99df634faa') <> 1 THEN RAISE EXCEPTION 'Repair must create exactly one portal record'; END IF;
  IF (SELECT payment_amount FROM public.customer_policies WHERE id=v_policy) IS NOT NULL THEN RAISE EXCEPTION 'Dealer trade amount must not be copied'; END IF;
  IF v_customer IS DISTINCT FROM (SELECT to_jsonb(c) FROM public.customers c WHERE id='994104ec-5531-4364-90c4-9f99df634faa')
    OR v_warranty IS DISTINCT FROM (SELECT to_jsonb(w) FROM public.dealer_warranties w WHERE customer_id='994104ec-5531-4364-90c4-9f99df634faa')
    OR v_quotes IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(q) ORDER BY q.id) FROM public.dealer_quotes q WHERE q.id IN (SELECT quote_id FROM public.dealer_warranties WHERE customer_id='994104ec-5531-4364-90c4-9f99df634faa')) THEN RAISE EXCEPTION 'Repair must preserve settled records'; END IF;
END;
$$;

-- Check the existing customer role and policies without granting or changing access.
DO $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id='9bc7af00-bfbe-458c-bf6f-46f508f11ef3';
  IF v_email IS NULL THEN RAISE EXCEPTION 'Reported customer login must exist'; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub','9bc7af00-bfbe-458c-bf6f-46f508f11ef3','role','authenticated','email',v_email)::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF (SELECT count(*) FROM public.customer_policies WHERE customer_id='eb38aa3a-6ae9-4132-b09d-be2fcde00dc6' AND user_id=auth.uid()) <> 1 THEN RAISE EXCEPTION 'Customer access must allow their restored warranty'; END IF;
  IF (SELECT count(*) FROM public.customers WHERE id='eb38aa3a-6ae9-4132-b09d-be2fcde00dc6') <> 1 THEN RAISE EXCEPTION 'Customer access must allow their linked vehicle'; END IF;
  EXECUTE 'RESET ROLE';
END;
$$;