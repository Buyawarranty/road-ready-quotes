ALTER TABLE public.trade_warranty_signups ADD COLUMN IF NOT EXISTS town text;

-- Signup notes: grants were missing, and the old check only knew legacy admin rows
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_warranty_signup_notes TO authenticated;
GRANT ALL ON public.trade_warranty_signup_notes TO service_role;
DROP POLICY IF EXISTS "Admins can manage signup notes" ON public.trade_warranty_signup_notes;
CREATE POLICY "Staff can manage signup notes" ON public.trade_warranty_signup_notes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.bdm_is_town_admin(auth.uid()) OR public.bdm_is_manager(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.bdm_is_town_admin(auth.uid()) OR public.bdm_is_manager(auth.uid()));

-- Same for updating the signup itself (town edits)
DROP POLICY IF EXISTS "Staff can update signups" ON public.trade_warranty_signups;
CREATE POLICY "Staff can update signups" ON public.trade_warranty_signups
  FOR UPDATE TO authenticated
  USING (public.bdm_is_town_admin(auth.uid()) OR public.bdm_is_manager(auth.uid()));

-- Copy every signup note into the dealer contact list history
CREATE OR REPLACE FUNCTION public.bdm_copy_signup_note() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM bdm_dealerships WHERE signup_id = NEW.signup_id LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO bdm_activities(dealership_id, bdm_user_id, activity_type, notes, created_at)
    VALUES (v_id, NEW.created_by, 'note', '[Sign-up note] ' || NEW.note_text, NEW.created_at);
    UPDATE bdm_dealerships SET latest_note = NEW.note_text, updated_at = now() WHERE id = v_id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.bdm_copy_signup_note() FROM anon, authenticated, public;
DROP TRIGGER IF EXISTS bdm_copy_signup_note ON public.trade_warranty_signup_notes;
CREATE TRIGGER bdm_copy_signup_note AFTER INSERT ON public.trade_warranty_signup_notes
  FOR EACH ROW EXECUTE FUNCTION public.bdm_copy_signup_note();

-- Town from the signup flows into the contact list (insert + later edits)
CREATE OR REPLACE FUNCTION public.bdm_sync_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM bdm_dealerships WHERE signup_id = NEW.id OR (NEW.dealer_id IS NOT NULL AND dealer_id = NEW.dealer_id) LIMIT 1;
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
      UPDATE bdm_dealerships SET dealer_id = coalesce(dealer_id, NEW.dealer_id), signup_id = coalesce(signup_id, NEW.id),
        stage = CASE WHEN stage IN ('active_dealer') THEN stage ELSE 'onboarding' END
      WHERE id = v_id AND (dealer_id IS NULL OR dealer_id = NEW.dealer_id)
        AND NOT EXISTS (SELECT 1 FROM bdm_dealerships o WHERE o.dealer_id = NEW.dealer_id AND o.id <> v_id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.bdm_sync_signup() FROM anon, authenticated, public;
DROP TRIGGER IF EXISTS bdm_sync_signup ON public.trade_warranty_signups;
CREATE TRIGGER bdm_sync_signup AFTER INSERT OR UPDATE OF dealer_id, town ON public.trade_warranty_signups
  FOR EACH ROW EXECUTE FUNCTION public.bdm_sync_signup();

-- Fill town on the signup from any contact-list town already set
UPDATE public.trade_warranty_signups s SET town = b.town
FROM public.bdm_dealerships b WHERE b.signup_id = s.id AND b.town IS NOT NULL AND s.town IS NULL;