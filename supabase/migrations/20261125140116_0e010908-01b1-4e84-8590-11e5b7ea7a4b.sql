CREATE OR REPLACE FUNCTION public.issue_dealer_intro_free(p_dealer_id uuid, p_dealer_quote_id uuid, p_duration_months integer, p_original_amount numeric, p_customer jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  c public.customers%ROWTYPE;
  e public.customers%ROWTYPE;
  q public.dealer_quotes%ROWTYPE;
  v_customer_id uuid := gen_random_uuid();
  v_reuse boolean := false;
  v_claim jsonb;
  v_sale jsonb;
  v_terms text;
BEGIN
  IF p_customer IS NULL OR jsonb_typeof(p_customer) <> 'object' THEN RAISE EXCEPTION 'Customer details are required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_dealer_id::text,0));
  IF NOT EXISTS (SELECT 1 FROM public.dealers WHERE id = p_dealer_id AND status = 'active') THEN RAISE EXCEPTION 'Dealer account is not active'; END IF;
  IF public.dealer_bogof_remaining(p_dealer_id) < 1 THEN RAISE EXCEPTION 'No free warranty available'; END IF;
  SELECT version INTO v_terms FROM public.dealer_trade_terms_versions ORDER BY created_at DESC LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM public.dealer_trade_terms_acceptances WHERE dealer_id = p_dealer_id AND terms_version = coalesce(v_terms,'2026-11-15-v1')) THEN RAISE EXCEPTION 'Please review and accept the Trade Terms & Conditions before issuing this warranty'; END IF;
  IF p_dealer_quote_id IS NOT NULL THEN
    SELECT * INTO q FROM public.dealer_quotes WHERE id = p_dealer_quote_id FOR UPDATE;
    IF NOT FOUND OR q.dealer_id IS DISTINCT FROM p_dealer_id OR q.paid_at IS NOT NULL OR lower(coalesce(q.status,'')) NOT IN ('draft','pending','quoted','awaiting_panda') THEN
      RAISE EXCEPTION 'This quote has already been processed. Open your warranties before trying again';
    END IF;
  END IF;
  SELECT * INTO c FROM jsonb_populate_record(NULL::public.customers,p_customer);
  IF c.dealer_id IS DISTINCT FROM p_dealer_id OR c.brand IS DISTINCT FROM 'pandaprotect' OR c.purchase_source IS DISTINCT FROM 'dealer' OR c.final_amount IS DISTINCT FROM 0::numeric OR c.payment_type IS DISTINCT FROM p_duration_months::text OR c.registration_plate IS NULL OR length(btrim(c.registration_plate)) < 2 THEN RAISE EXCEPTION 'Invalid free-warranty details'; END IF;
  SELECT * INTO e FROM public.customers
    WHERE lower(email) = lower(btrim(c.email))
      AND upper(replace(registration_plate,' ','')) = upper(replace(c.registration_plate,' ',''))
      AND status IN ('Active','Pending','active','pending') AND NOT coalesce(is_deleted,false)
    FOR UPDATE;
  IF FOUND THEN
    -- The metadata below is attached only by the authenticated service after verifying any previous card session.
    IF e.dealer_id IS DISTINCT FROM p_dealer_id OR e.brand IS DISTINCT FROM 'pandaprotect' OR e.purchase_source IS DISTINCT FROM 'dealer'
      OR lower(e.status) IS DISTINCT FROM 'pending' OR e.payment_status IS DISTINCT FROM 'pending'
      OR coalesce(e.payment_verified,false) OR e.payment_verified_at IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.dealer_warranties WHERE customer_id=e.id)
      OR EXISTS (SELECT 1 FROM public.customer_policies WHERE customer_id=e.id)
      OR (p_customer->>'_reuse_customer_id') IS DISTINCT FROM e.id::text THEN
      RAISE EXCEPTION 'This customer and vehicle already have a warranty or a changed checkout. Open your warranties before trying again';
    END IF;
    IF e.stripe_session_id IS NOT NULL AND (p_customer->>'_expired_stripe_session_id') IS DISTINCT FROM e.stripe_session_id THEN
      RAISE EXCEPTION 'The earlier card checkout must be checked before issuing a free warranty';
    END IF;
    v_reuse := true;
    v_customer_id := e.id;
  ELSIF p_customer->>'_reuse_customer_id' IS NOT NULL THEN
    RAISE EXCEPTION 'The earlier checkout has changed. Open your warranties before trying again';
  END IF;
  IF v_reuse THEN
    UPDATE public.customers SET
      name=c.name,email=lower(btrim(c.email)),phone=c.phone,first_name=c.first_name,last_name=c.last_name,
      street=c.street,building_name=c.building_name,town=c.town,postcode=upper(c.postcode),country=c.country,
      registration_plate=upper(replace(c.registration_plate,' ','')),vehicle_make=c.vehicle_make,vehicle_model=c.vehicle_model,
      vehicle_year=c.vehicle_year,vehicle_fuel_type=c.vehicle_fuel_type,vehicle_transmission=c.vehicle_transmission,mileage=c.mileage,
      plan_type=c.plan_type,payment_type=p_duration_months::text,claim_limit=c.claim_limit,voluntary_excess=c.voluntary_excess,labour_rate=c.labour_rate,
      final_amount=0,original_amount=p_original_amount,discount_amount=p_original_amount,discount_code='BOGOF FREE',
      status='Pending',payment_status='pending',payment_verified=false,stripe_session_id=NULL,
      signup_date=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',is_manual_entry=false,
      is_test=(SELECT coalesce(is_test,false) FROM public.dealers WHERE id=p_dealer_id)
    WHERE id=v_customer_id;
    IF e.stripe_session_id IS NOT NULL THEN
      UPDATE public.dealer_promo_redemptions SET status='cancelled' WHERE stripe_session_id=e.stripe_session_id AND status='reserved';
    END IF;
  ELSE
    INSERT INTO public.customers (
      id,name,email,phone,first_name,last_name,street,building_name,town,postcode,country,
      registration_plate,vehicle_make,vehicle_model,vehicle_year,vehicle_fuel_type,vehicle_transmission,mileage,
      plan_type,payment_type,claim_limit,voluntary_excess,labour_rate,final_amount,original_amount,discount_amount,discount_code,
      status,payment_status,payment_verified,purchase_source,dealer_id,signup_date,is_manual_entry,brand,is_test
    ) VALUES (
      v_customer_id,c.name,lower(btrim(c.email)),c.phone,c.first_name,c.last_name,c.street,c.building_name,c.town,upper(c.postcode),c.country,
      upper(replace(c.registration_plate,' ','')),c.vehicle_make,c.vehicle_model,c.vehicle_year,c.vehicle_fuel_type,c.vehicle_transmission,c.mileage,
      c.plan_type,p_duration_months::text,c.claim_limit,c.voluntary_excess,c.labour_rate,0,p_original_amount,p_original_amount,'BOGOF FREE',
      'Pending','pending',false,'dealer',p_dealer_id,date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',false,'pandaprotect',
      (SELECT coalesce(is_test,false) FROM public.dealers WHERE id=p_dealer_id)
    );
  END IF;
  v_claim := public.claim_dealer_intro_free(p_dealer_id,v_customer_id,p_duration_months,p_original_amount);
  UPDATE public.dealer_intro_free_redemptions SET dealer_quote_id=p_dealer_quote_id WHERE customer_id=v_customer_id;
  UPDATE public.customers SET status='Active',payment_status='paid',payment_verified=true,payment_verified_at=now(),payment_verification_status='verified',payment_verification_source='bogof_free' WHERE id=v_customer_id;
  IF p_dealer_quote_id IS NOT NULL THEN
    UPDATE public.dealer_quotes SET stripe_session_id=NULL WHERE id=p_dealer_quote_id AND paid_at IS NULL AND lower(status) IN ('draft','pending','quoted','awaiting_panda');
  END IF;
  v_sale := public.complete_dealer_sale(v_customer_id,p_dealer_quote_id,NULL,'paid');
  PERFORM public.ensure_dealer_customer_portal_policy(v_customer_id);
  RETURN v_sale || jsonb_build_object('slot',(v_claim->>'slot')::integer,'total',0);
END;
$function$;
REVOKE ALL ON FUNCTION public.issue_dealer_intro_free(uuid,uuid,integer,numeric,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_dealer_intro_free(uuid,uuid,integer,numeric,jsonb) TO service_role;