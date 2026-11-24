CREATE OR REPLACE FUNCTION public.ensure_dealer_customer_portal_policy(p_customer_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.customers%ROWTYPE;
  w public.dealer_warranties%ROWTYPE;
  v_policy_id uuid;
  v_email text;
  v_reference text;
  v_user_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_customer_id::text));
  SELECT * INTO c FROM public.customers WHERE id = p_customer_id;
  IF NOT FOUND OR c.brand IS DISTINCT FROM 'pandaprotect' OR c.dealer_id IS NULL
     OR COALESCE(c.is_deleted, false) OR lower(c.status) NOT IN ('active', 'scheduled')
     OR NOT (COALESCE(c.payment_verified, false) OR c.payment_status IN ('invoice_pending', 'overdue')) THEN
    RETURN NULL;
  END IF;
  v_email := lower(btrim(c.email));
  IF v_email IS NULL OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RETURN NULL; END IF;
  SELECT * INTO w FROM public.dealer_warranties
    WHERE customer_id = c.id AND dealer_id = c.dealer_id
      AND lower(status) IN ('active', 'scheduled');
  IF NOT FOUND OR w.start_date IS NULL OR w.end_date IS NULL THEN RETURN NULL; END IF;
  v_reference := COALESCE(NULLIF(c.warranty_number, ''), NULLIF(c.warranty_reference_number, ''));
  IF v_reference IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_policy_id FROM public.customer_policies
    WHERE customer_id = c.id OR warranty_number = v_reference OR policy_number = v_reference
    ORDER BY created_at LIMIT 1;
  IF FOUND THEN RETURN v_policy_id; END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(btrim(email)) = v_email LIMIT 1;
  INSERT INTO public.customer_policies (
    user_id, email, customer_id, plan_type, payment_type, policy_number, warranty_number,
    policy_start_date, policy_end_date, status, address, customer_full_name,
    payment_verified, is_manual_entry, is_deleted, payment_amount, seasonal_bonus_months,
    claim_limit, voluntary_excess, mot_fee, tyre_cover, wear_tear, europe_cover, transfer_cover,
    breakdown_recovery, vehicle_rental, mot_repair, lost_key, consequential
  ) VALUES (
    v_user_id, v_email, c.id, c.plan_type, c.payment_type, v_reference, v_reference,
    w.start_date::timestamp AT TIME ZONE 'UTC', w.end_date::timestamp AT TIME ZONE 'UTC',
    CASE WHEN lower(c.status) = 'scheduled' THEN 'scheduled' ELSE 'active' END,
    jsonb_build_object('flatNumber', c.flat_number, 'buildingName', c.building_name,
      'buildingNumber', c.building_number, 'street', c.street, 'city', c.town,
      'county', c.county, 'postcode', c.postcode, 'country', c.country),
    c.name, c.payment_verified, c.is_manual_entry, false, NULL, 0,
    c.claim_limit, c.voluntary_excess, c.mot_fee, c.tyre_cover, c.wear_tear, c.europe_cover,
    c.transfer_cover, c.breakdown_recovery, c.vehicle_rental, c.mot_repair, c.lost_key, c.consequential
  ) ON CONFLICT DO NOTHING RETURNING id INTO v_policy_id;
  IF v_policy_id IS NULL THEN
    SELECT id INTO v_policy_id FROM public.customer_policies
      WHERE customer_id = c.id OR warranty_number = v_reference OR policy_number = v_reference
      ORDER BY created_at LIMIT 1;
  END IF;
  RETURN v_policy_id;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_dealer_customer_portal_policy(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_dealer_customer_portal_policy(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.create_missing_dealer_customer_portal_policy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'dealer_warranties' THEN
    PERFORM public.ensure_dealer_customer_portal_policy(NEW.customer_id);
  ELSE
    PERFORM public.ensure_dealer_customer_portal_policy(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_missing_dealer_customer_portal_policy() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_missing_dealer_customer_portal_policy() TO service_role;
CREATE TRIGGER trg_dealer_warranty_customer_portal
AFTER INSERT OR UPDATE OF status ON public.dealer_warranties
FOR EACH ROW EXECUTE FUNCTION public.create_missing_dealer_customer_portal_policy();
CREATE TRIGGER trg_dealer_customer_portal_details
AFTER UPDATE OF email, status, payment_verified ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.create_missing_dealer_customer_portal_policy();

-- Repair only the missing portal record reported in the screenshot. Never update the sale.
DO $$
DECLARE before_customer jsonb; before_warranty jsonb; before_quote jsonb; after_policy uuid;
BEGIN
  SELECT to_jsonb(c) INTO before_customer FROM public.customers c WHERE id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6';
  SELECT to_jsonb(w) INTO before_warranty FROM public.dealer_warranties w WHERE customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6';
  SELECT to_jsonb(q) INTO before_quote FROM public.dealer_quotes q WHERE id = '26548b26-ecc9-4d99-b899-dc888d05d35e';
  after_policy := public.ensure_dealer_customer_portal_policy('eb38aa3a-6ae9-4132-b09d-be2fcde00dc6');
  IF after_policy IS NULL THEN RAISE EXCEPTION 'Reported warranty could not be linked to the customer portal'; END IF;
  IF after_policy IS DISTINCT FROM public.ensure_dealer_customer_portal_policy('eb38aa3a-6ae9-4132-b09d-be2fcde00dc6') THEN
    RAISE EXCEPTION 'Customer portal creation must be idempotent';
  END IF;
  IF before_customer IS DISTINCT FROM (SELECT to_jsonb(c) FROM public.customers c WHERE id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6')
    OR before_warranty IS DISTINCT FROM (SELECT to_jsonb(w) FROM public.dealer_warranties w WHERE customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6')
    OR before_quote IS DISTINCT FROM (SELECT to_jsonb(q) FROM public.dealer_quotes q WHERE id = '26548b26-ecc9-4d99-b899-dc888d05d35e') THEN
    RAISE EXCEPTION 'Portal repair must not alter settled records';
  END IF;
END;
$$;