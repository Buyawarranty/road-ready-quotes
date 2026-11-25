CREATE OR REPLACE FUNCTION public.dealer_bogof_remaining(p_dealer_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT coalesce((SELECT enabled FROM public.dealer_bogof_settings WHERE id = 1), false) THEN 0
  ELSE greatest(0,
    least(3, (SELECT count(*) FROM public.customers WHERE dealer_id = p_dealer_id
      AND brand = 'pandaprotect' AND payment_status = 'paid' AND coalesce(final_amount,0) > 0
      AND lower(coalesce(status,'')) NOT IN ('cancelled','refunded'))::int)
    - (SELECT count(*) FROM public.dealer_intro_free_redemptions WHERE dealer_id = p_dealer_id AND status <> 'rejected')::int)
  END
$$;
REVOKE EXECUTE ON FUNCTION public.dealer_bogof_remaining(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dealer_bogof_remaining(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_dealer_intro_free(p_dealer_id uuid, p_customer_id uuid, p_duration_months integer, p_original_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slot integer;
BEGIN
  IF p_duration_months IS NULL OR p_duration_months < 1 OR p_duration_months > 36 THEN RAISE EXCEPTION 'Free cover is limited to three years'; END IF;
  IF p_original_amount IS NULL OR p_original_amount <= 0 THEN RAISE EXCEPTION 'Invalid original amount'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_dealer_id::text, 0));
  IF NOT EXISTS (SELECT 1 FROM public.dealers WHERE id = p_dealer_id AND status = 'active') THEN RAISE EXCEPTION 'Dealer account is not active'; END IF;
  IF public.dealer_bogof_remaining(p_dealer_id) < 1 THEN RAISE EXCEPTION 'No free warranty available'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id AND dealer_id = p_dealer_id
    AND brand = 'pandaprotect' AND payment_status = 'pending' AND lower(status) = 'pending'
    AND coalesce(final_amount,0) = 0 AND NOT coalesce(payment_verified,false)
    AND payment_type = p_duration_months::text AND discount_code = 'BOGOF FREE') THEN
    RAISE EXCEPTION 'A matching pending free-warranty customer is required';
  END IF;
  SELECT min(s) INTO v_slot FROM generate_series(1,3) s WHERE NOT EXISTS (
    SELECT 1 FROM public.dealer_intro_free_redemptions r WHERE r.dealer_id = p_dealer_id AND r.slot = s AND r.status <> 'rejected');
  IF v_slot IS NULL THEN RAISE EXCEPTION 'No free warranty available'; END IF;
  INSERT INTO public.dealer_intro_free_redemptions (dealer_id,customer_id,slot,duration_months,original_amount,status,reviewed_at,review_note)
  VALUES (p_dealer_id,p_customer_id,v_slot,p_duration_months,p_original_amount,'approved',now(),'Buy one get one free — automatic');
  RETURN jsonb_build_object('slot',v_slot);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_dealer_intro_free(uuid,uuid,integer,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_dealer_intro_free(uuid,uuid,integer,numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.issue_dealer_intro_free(p_dealer_id uuid,p_dealer_quote_id uuid,p_duration_months integer,p_original_amount numeric,p_customer jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.customers%ROWTYPE;
  q public.dealer_quotes%ROWTYPE;
  v_customer_id uuid := gen_random_uuid();
  v_claim jsonb;
  v_sale jsonb;
  v_terms text;
BEGIN
  IF p_customer IS NULL OR jsonb_typeof(p_customer) <> 'object' THEN RAISE EXCEPTION 'Customer details are required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_dealer_id::text,0));
  IF NOT EXISTS (SELECT 1 FROM public.dealers WHERE id = p_dealer_id AND status = 'active') THEN RAISE EXCEPTION 'Dealer account is not active'; END IF;
  IF public.dealer_bogof_remaining(p_dealer_id) < 1 THEN RAISE EXCEPTION 'No free warranty available'; END IF;
  SELECT version INTO v_terms FROM public.dealer_trade_terms_versions ORDER BY created_at DESC LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM public.dealer_trade_terms_acceptances WHERE dealer_id = p_dealer_id
    AND terms_version = coalesce(v_terms,'2026-11-15-v1')) THEN RAISE EXCEPTION 'Please review and accept the Trade Terms & Conditions before issuing this warranty'; END IF;
  IF p_dealer_quote_id IS NOT NULL THEN
    SELECT * INTO q FROM public.dealer_quotes WHERE id = p_dealer_quote_id FOR UPDATE;
    IF NOT FOUND OR q.dealer_id IS DISTINCT FROM p_dealer_id OR q.paid_at IS NOT NULL
      OR lower(coalesce(q.status,'')) NOT IN ('draft','pending','quoted','awaiting_panda') THEN
      RAISE EXCEPTION 'This quote has already been processed. Open your warranties before trying again';
    END IF;
  END IF;
  SELECT * INTO c FROM jsonb_populate_record(NULL::public.customers,p_customer);
  IF c.dealer_id IS DISTINCT FROM p_dealer_id OR c.brand IS DISTINCT FROM 'pandaprotect'
    OR c.purchase_source IS DISTINCT FROM 'dealer' OR c.final_amount IS DISTINCT FROM 0::numeric
    OR c.payment_type IS DISTINCT FROM p_duration_months::text
    OR c.registration_plate IS NULL OR length(btrim(c.registration_plate)) < 2 THEN
    RAISE EXCEPTION 'Invalid free-warranty details';
  END IF;
  INSERT INTO public.customers (
    id,name,email,phone,first_name,last_name,street,building_name,town,postcode,country,
    registration_plate,vehicle_make,vehicle_model,vehicle_year,vehicle_fuel_type,vehicle_transmission,mileage,
    plan_type,payment_type,claim_limit,voluntary_excess,labour_rate,final_amount,original_amount,discount_amount,discount_code,
    status,payment_status,payment_verified,purchase_source,dealer_id,signup_date,is_manual_entry,brand,is_test
  ) VALUES (
    v_customer_id,c.name,lower(btrim(c.email)),c.phone,c.first_name,c.last_name,c.street,c.building_name,c.town,upper(c.postcode),c.country,
    upper(regexp_replace(c.registration_plate,'\s','','g')),c.vehicle_make,c.vehicle_model,c.vehicle_year,c.vehicle_fuel_type,c.vehicle_transmission,c.mileage,
    c.plan_type,p_duration_months::text,c.claim_limit,c.voluntary_excess,c.labour_rate,0,p_original_amount,p_original_amount,'BOGOF FREE',
    'Pending','pending',false,'dealer',p_dealer_id,date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',false,'pandaprotect',
    (SELECT coalesce(is_test,false) FROM public.dealers WHERE id = p_dealer_id)
  );
  v_claim := public.claim_dealer_intro_free(p_dealer_id,v_customer_id,p_duration_months,p_original_amount);
  UPDATE public.dealer_intro_free_redemptions SET dealer_quote_id = p_dealer_quote_id WHERE customer_id = v_customer_id;
  UPDATE public.customers SET status = 'Active',payment_status = 'paid',payment_verified = true,
    payment_verified_at = now(),payment_verification_status = 'verified',payment_verification_source = 'bogof_free'
    WHERE id = v_customer_id;
  v_sale := public.complete_dealer_sale(v_customer_id,p_dealer_quote_id,NULL,'paid');
  PERFORM public.ensure_dealer_customer_portal_policy(v_customer_id);
  RETURN v_sale || jsonb_build_object('slot',(v_claim->>'slot')::integer,'total',0);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.issue_dealer_intro_free(uuid,uuid,integer,numeric,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_dealer_intro_free(uuid,uuid,integer,numeric,jsonb) TO service_role;