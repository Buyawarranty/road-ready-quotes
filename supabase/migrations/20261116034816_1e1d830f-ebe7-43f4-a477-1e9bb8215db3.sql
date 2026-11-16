ALTER TABLE public.dealer_intro_free_redemptions
  ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  ADD COLUMN dealer_quote_id uuid,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN review_note text;
UPDATE public.dealer_intro_free_redemptions SET status = 'approved', reviewed_at = created_at;
ALTER TABLE public.dealer_intro_free_redemptions DROP CONSTRAINT IF EXISTS dealer_intro_free_redemptions_dealer_id_slot_key;
CREATE UNIQUE INDEX dealer_intro_free_redemptions_live_slot ON public.dealer_intro_free_redemptions (dealer_id, slot) WHERE status <> 'rejected';

CREATE OR REPLACE FUNCTION public.claim_dealer_intro_free(p_dealer_id uuid, p_customer_id uuid, p_duration_months integer, p_original_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paid integer; v_slot integer;
BEGIN
  IF p_duration_months < 1 OR p_duration_months > 36 THEN RAISE EXCEPTION 'introductory cover is limited to three years'; END IF;
  IF p_original_amount < 0 THEN RAISE EXCEPTION 'invalid original amount'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_dealer_id::text, 0));
  SELECT count(*) INTO v_paid FROM public.customers
    WHERE dealer_id = p_dealer_id AND payment_status = 'paid' AND coalesce(final_amount, 0) > 0;
  IF v_paid < 3 THEN RAISE EXCEPTION 'three paid warranties are required'; END IF;
  SELECT min(s) INTO v_slot FROM generate_series(1,3) s
    WHERE NOT EXISTS (SELECT 1 FROM public.dealer_intro_free_redemptions r WHERE r.dealer_id = p_dealer_id AND r.slot = s AND r.status <> 'rejected');
  IF v_slot IS NULL THEN RAISE EXCEPTION 'introductory free warranties have been used'; END IF;
  INSERT INTO public.dealer_intro_free_redemptions (dealer_id, customer_id, slot, duration_months, original_amount, status)
  VALUES (p_dealer_id, p_customer_id, v_slot, p_duration_months, p_original_amount, 'pending');
  RETURN jsonb_build_object('slot', v_slot);
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_dealer_intro_free(uuid, uuid, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_dealer_intro_free(uuid, uuid, integer, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.review_dealer_intro_free(p_redemption_id uuid, p_decision text, p_reviewer uuid, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.dealer_intro_free_redemptions;
BEGIN
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'invalid decision'; END IF;
  SELECT * INTO r FROM public.dealer_intro_free_redemptions WHERE id = p_redemption_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF r.status <> 'pending' THEN RETURN jsonb_build_object('status', r.status, 'already', true, 'customer_id', r.customer_id, 'dealer_quote_id', r.dealer_quote_id); END IF;
  UPDATE public.dealer_intro_free_redemptions
    SET status = p_decision, reviewed_by = p_reviewer, reviewed_at = now(), review_note = p_note
    WHERE id = p_redemption_id;
  IF p_decision = 'approved' THEN
    UPDATE public.customers SET status = 'Active', payment_status = 'paid', payment_verified = true,
      payment_verified_at = now(), payment_verified_by = p_reviewer, payment_verification_status = 'verified',
      payment_verification_source = 'admin_intro_free', payment_verification_ref = p_reviewer
    WHERE id = r.customer_id;
  ELSE
    UPDATE public.customers SET status = 'Cancelled', payment_status = 'intro_rejected', payment_verified = false
    WHERE id = r.customer_id;
  END IF;
  RETURN jsonb_build_object('status', p_decision, 'customer_id', r.customer_id, 'dealer_quote_id', r.dealer_quote_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.review_dealer_intro_free(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_dealer_intro_free(uuid, text, uuid, text) TO service_role;