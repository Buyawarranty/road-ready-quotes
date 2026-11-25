-- Transactional regression: all fixture rows roll back, including their triggered records.
DO $$
DECLARE
  v_user uuid; v_dealer uuid := gen_random_uuid(); v_quote uuid;
  v_result jsonb; v_customer jsonb; v_term text; v_before integer; v_cycle integer;
  v_snapshot jsonb; v_paid_id uuid; v_customer_id uuid;
BEGIN
  IF has_function_privilege('authenticated','public.issue_dealer_intro_free(uuid,uuid,integer,numeric,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.issue_dealer_intro_free(uuid,uuid,integer,numeric,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Free issuance must remain service-only';
  END IF;
  IF NOT has_function_privilege('service_role','public.issue_dealer_intro_free(uuid,uuid,integer,numeric,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Checkout service needs free issuance access';
  END IF;
  IF NOT coalesce((SELECT enabled FROM public.dealer_bogof_settings WHERE id=1),false) THEN
    RAISE EXCEPTION 'Run this regression while the offer is enabled; it never changes the saved switch';
  END IF;
  SELECT u.id INTO v_user FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.dealers d WHERE d.user_id=u.id) ORDER BY u.created_at LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'An unlinked existing account is required for rollback-only fixtures'; END IF;
  BEGIN
    INSERT INTO public.dealers(id,user_id,name,email,company_name,status,is_test)
      VALUES(v_dealer,v_user,'BOGOF regression','bogof-regression@example.test','Rollback-only BOGOF regression','active',true);
    SELECT coalesce((SELECT version FROM public.dealer_trade_terms_versions ORDER BY created_at DESC LIMIT 1),'2026-11-15-v1') INTO v_term;
    INSERT INTO public.dealer_trade_terms_acceptances(dealer_id,terms_version,accepted_by) VALUES(v_dealer,v_term,v_user);
    IF public.dealer_bogof_remaining(v_dealer) <> 0 THEN RAISE EXCEPTION 'A dealer with no paid purchases must have zero free warranties'; END IF;
    FOR v_cycle IN 1..3 LOOP
      v_paid_id := gen_random_uuid();
      INSERT INTO public.customers(id,name,email,plan_type,registration_plate,dealer_id,brand,purchase_source,
        payment_status,status,final_amount,payment_type,is_test,payment_verified)
        VALUES(v_paid_id,'Rollback-only paid buyer','paid-'||v_cycle||'@example.test','gold','BGFP'||v_cycle,
          v_dealer,'pandaprotect','dealer','paid','Active',99,'12',true,true);
      SELECT to_jsonb(c) INTO v_snapshot FROM public.customers c WHERE id=v_paid_id;
      IF public.dealer_bogof_remaining(v_dealer) <> 1 THEN RAISE EXCEPTION 'Paid purchase % must earn exactly one free warranty',v_cycle; END IF;
      INSERT INTO public.dealer_quotes(dealer_id,vehicle_reg,status) VALUES(v_dealer,'BGFF'||v_cycle,'draft') RETURNING id INTO v_quote;
      v_customer := jsonb_build_object('name','Rollback-only free buyer','email','free-'||v_cycle||'@example.test',
        'dealer_id',v_dealer,'brand','pandaprotect','purchase_source','dealer','registration_plate','BGFF'||v_cycle,
        'plan_type','gold','payment_type','36','final_amount',0,'postcode','SW1A 1AA');
      IF v_cycle=1 THEN
        SELECT count(*) INTO v_before FROM public.customers WHERE dealer_id=v_dealer;
        BEGIN
          PERFORM public.issue_dealer_intro_free(v_dealer,v_quote,48,99,v_customer||jsonb_build_object('payment_type','48'));
          RAISE EXCEPTION USING ERRCODE='ZBF02',MESSAGE='Four-year free cover must be rejected';
        EXCEPTION WHEN OTHERS THEN
          IF SQLSTATE='ZBF02' THEN RAISE; END IF;
        END;
        IF (SELECT count(*) FROM public.customers WHERE dealer_id=v_dealer) <> v_before
          OR public.dealer_bogof_remaining(v_dealer) <> 1 THEN RAISE EXCEPTION 'Failed issuance must leave no customer and preserve the free entitlement'; END IF;
      END IF;
      v_result := public.issue_dealer_intro_free(v_dealer,v_quote,36,99,v_customer);
      v_customer_id := (v_result->>'customer_id')::uuid;
      IF (v_result->>'total')::numeric <> 0 OR (v_result->>'slot')::integer <> v_cycle THEN RAISE EXCEPTION 'Free warranty % must be zero charge in its own slot',v_cycle; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id=v_customer_id AND final_amount=0
        AND payment_status='paid' AND status='Active' AND payment_verified AND stripe_session_id IS NULL) THEN
        RAISE EXCEPTION 'Free warranty must activate without a card session';
      END IF;
      IF (SELECT count(*) FROM public.dealer_warranties WHERE customer_id=v_customer_id) <> 1
        OR (SELECT count(*) FROM public.customer_policies WHERE customer_id=v_customer_id AND payment_amount IS NULL) <> 1 THEN
        RAISE EXCEPTION 'Free warranty must have exactly one dealer warranty and customer-safe portal policy';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.dealer_quotes WHERE id=v_quote AND status='paid' AND paid_at IS NOT NULL) THEN
        RAISE EXCEPTION 'A free warranty must complete its quote';
      END IF;
      IF public.dealer_bogof_remaining(v_dealer) <> 0 THEN RAISE EXCEPTION 'A free warranty cannot earn another free warranty'; END IF;
      IF (SELECT to_jsonb(c) FROM public.customers c WHERE id=v_paid_id) IS DISTINCT FROM v_snapshot THEN
        RAISE EXCEPTION 'Free activation must preserve the settled paid purchase';
      END IF;
      BEGIN
        PERFORM public.issue_dealer_intro_free(v_dealer,v_quote,36,99,v_customer);
        RAISE EXCEPTION USING ERRCODE='ZBF03',MESSAGE='Repeated free activation must be rejected';
      EXCEPTION WHEN OTHERS THEN IF SQLSTATE='ZBF03' THEN RAISE; END IF; END;
      IF (SELECT count(*) FROM public.dealer_intro_free_redemptions WHERE dealer_id=v_dealer) <> v_cycle THEN
        RAISE EXCEPTION 'A retry must not consume another free slot';
      END IF;
    END LOOP;
    INSERT INTO public.customers(name,email,plan_type,registration_plate,dealer_id,brand,payment_status,status,final_amount,is_test)
      VALUES('Rollback-only fourth buyer','fourth@example.test','gold','BGFP4',v_dealer,'pandaprotect','paid','Active',99,true);
    IF public.dealer_bogof_remaining(v_dealer) <> 0 THEN RAISE EXCEPTION 'Fourth paid warranty cannot earn a fourth free warranty'; END IF;
    RAISE EXCEPTION USING ERRCODE='ZBF01',MESSAGE='Successful regression: roll back every fixture';
  EXCEPTION WHEN SQLSTATE 'ZBF01' THEN NULL; END;
  IF EXISTS(SELECT 1 FROM public.dealers WHERE id=v_dealer)
    OR EXISTS(SELECT 1 FROM public.customers WHERE dealer_id=v_dealer) THEN RAISE EXCEPTION 'Regression fixtures must be fully removed'; END IF;
END;
$$;