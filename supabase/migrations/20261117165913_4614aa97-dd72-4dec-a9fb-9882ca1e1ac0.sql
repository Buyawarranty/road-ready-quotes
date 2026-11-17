CREATE OR REPLACE FUNCTION public.bdm_sync_signup()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM bdm_dealerships WHERE signup_id = NEW.id LIMIT 1;
  IF v_id IS NULL AND NEW.dealer_id IS NOT NULL THEN
    SELECT id INTO v_id FROM bdm_dealerships WHERE dealer_id = NEW.dealer_id LIMIT 1;
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO bdm_dealerships(name, phone, email, est_monthly_sales, current_provider, lead_source, stage, signup_id, dealer_id, latest_note, town)
    VALUES (coalesce(nullif(NEW.dealership_name,''), 'Unnamed dealership'), NEW.phone_number, NEW.email_address,
      CASE WHEN NEW.monthly_vehicle_sales ~ '^\d+$' THEN NEW.monthly_vehicle_sales::int END,
      NEW.current_warranty_provider, 'Website sign-up',
      CASE WHEN NEW.dealer_id IS NOT NULL THEN 'onboarding' ELSE 'new_lead' END, NEW.id,
      (SELECT id FROM dealers WHERE id = NEW.dealer_id), nullif(NEW.additional_information,''), nullif(trim(NEW.town),''))
    RETURNING id INTO v_id;
    IF coalesce(NEW.contact_name,'') <> '' THEN
      INSERT INTO bdm_contacts(dealership_id, full_name, phone, email, is_primary, is_decision_maker)
      VALUES (v_id, NEW.contact_name, NEW.phone_number, NEW.email_address, true, true);
    END IF;
  ELSE
    IF nullif(trim(NEW.town),'') IS NOT NULL THEN
      UPDATE bdm_dealerships SET town = trim(NEW.town) WHERE id = v_id AND town IS DISTINCT FROM trim(NEW.town);
    END IF;
    IF NEW.dealer_id IS NOT NULL THEN
      UPDATE bdm_dealerships SET
        dealer_id = CASE WHEN dealer_id IS NULL AND NOT EXISTS (SELECT 1 FROM bdm_dealerships o WHERE o.dealer_id = NEW.dealer_id AND o.id <> v_id) THEN NEW.dealer_id ELSE dealer_id END,
        signup_id = CASE WHEN signup_id IS NULL AND NOT EXISTS (SELECT 1 FROM bdm_dealerships o WHERE o.signup_id = NEW.id AND o.id <> v_id) THEN NEW.id ELSE signup_id END,
        stage = CASE WHEN stage IN ('active_dealer') THEN stage ELSE 'onboarding' END
      WHERE id = v_id;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;