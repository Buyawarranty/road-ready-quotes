-- Read-only/idempotent production regression checks: no example sales or settled-record updates.
DO $$
DECLARE v_id uuid; v_customer jsonb; v_warranty jsonb; v_quote jsonb; v_before jsonb; v_policy jsonb; v_pending uuid;
BEGIN
  SELECT to_jsonb(c) INTO v_customer FROM public.customers c WHERE id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6';
  SELECT to_jsonb(w) INTO v_warranty FROM public.dealer_warranties w WHERE customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6';
  SELECT to_jsonb(q) INTO v_quote FROM public.dealer_quotes q WHERE id = '26548b26-ecc9-4d99-b899-dc888d05d35e';
  SELECT to_jsonb(p) INTO v_before FROM public.customer_policies p WHERE customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6';
  v_id := public.ensure_dealer_customer_portal_policy('eb38aa3a-6ae9-4132-b09d-be2fcde00dc6');
  IF lower(v_customer->>'status') IN ('cancelled', 'refunded', 'expired') AND v_id IS NOT NULL THEN
    RAISE EXCEPTION 'Recovery cannot issue cover for a terminal sale';
  END IF;
  SELECT to_jsonb(p) INTO v_policy FROM public.customer_policies p WHERE customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6';
  IF v_policy IS NULL OR v_policy->>'warranty_number' <> 'PP-2611-402020' THEN RAISE EXCEPTION 'Confirmed warranty must be available in the portal'; END IF;
  IF v_policy->>'user_id' <> '9bc7af00-bfbe-458c-bf6f-46f508f11ef3' THEN RAISE EXCEPTION 'Policy must belong to its customer login'; END IF;
  IF (v_policy->>'policy_start_date')::timestamptz <> '2026-11-24T00:00:00Z'::timestamptz
    OR (v_policy->>'policy_end_date')::timestamptz <> '2027-11-24T00:00:00Z'::timestamptz THEN RAISE EXCEPTION 'Portal dates must match the issued warranty'; END IF;
  IF v_policy->>'payment_amount' IS NOT NULL THEN RAISE EXCEPTION 'Dealer trade price must be excluded'; END IF;
  IF v_before IS DISTINCT FROM v_policy THEN RAISE EXCEPTION 'Retry must preserve the existing portal record'; END IF;
  IF (SELECT count(*) FROM public.customer_policies WHERE customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6') <> 1 THEN RAISE EXCEPTION 'Retry must not duplicate policies'; END IF;
  IF v_customer IS DISTINCT FROM (SELECT to_jsonb(c) FROM public.customers c WHERE id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6')
    OR v_warranty IS DISTINCT FROM (SELECT to_jsonb(w) FROM public.dealer_warranties w WHERE customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6')
    OR v_quote IS DISTINCT FROM (SELECT to_jsonb(q) FROM public.dealer_quotes q WHERE id = '26548b26-ecc9-4d99-b899-dc888d05d35e') THEN RAISE EXCEPTION 'Settled records must remain unchanged'; END IF;
  IF public.ensure_dealer_customer_portal_policy('00000000-0000-0000-0000-000000000000') IS NOT NULL THEN RAISE EXCEPTION 'Unknown sales cannot gain cover'; END IF;
  SELECT id INTO v_pending FROM public.customers WHERE brand = 'pandaprotect' AND dealer_id IS NOT NULL AND status = 'Pending' AND NOT COALESCE(payment_verified, false) ORDER BY created_at DESC LIMIT 1;
  IF v_pending IS NOT NULL AND public.ensure_dealer_customer_portal_policy(v_pending) IS NOT NULL THEN RAISE EXCEPTION 'Unpaid checkouts cannot gain cover'; END IF;
  IF has_function_privilege('anon', 'public.ensure_dealer_customer_portal_policy(uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.ensure_dealer_customer_portal_policy(uuid)', 'EXECUTE') THEN RAISE EXCEPTION 'Portal creation must stay service-only'; END IF;
END;
$$;