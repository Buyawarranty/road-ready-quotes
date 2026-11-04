-- Helper role checks (roles live in admin_users)
CREATE OR REPLACE FUNCTION public.bdm_is_super(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = _uid AND is_active AND role::text = 'super_admin');
$$;
CREATE OR REPLACE FUNCTION public.bdm_is_manager(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = _uid AND is_active AND role::text IN ('super_admin','admin','sales_manager'));
$$;
CREATE OR REPLACE FUNCTION public.bdm_is_staff(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = _uid AND is_active);
$$;

CREATE TABLE public.bdm_dealerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text, town text, county text, postcode text,
  phone text, email text, website text,
  website_domain text GENERATED ALWAYS AS (nullif(lower(regexp_replace(regexp_replace(coalesce(website,''), '^(https?://)?(www\.)?', ''), '/.*$', '')), '')) STORED,
  phone_digits text GENERATED ALWAYS AS (nullif(right(regexp_replace(coalesce(phone,''), '\D', '', 'g'), 10), '')) STORED,
  vehicle_stock integer CHECK (vehicle_stock IS NULL OR vehicle_stock >= 0),
  stock_updated_at timestamptz,
  est_monthly_sales integer CHECK (est_monthly_sales IS NULL OR est_monthly_sales >= 0),
  current_provider text, lead_source text,
  priority text NOT NULL DEFAULT 'medium',
  stage text NOT NULL DEFAULT 'new_lead',
  do_not_contact boolean NOT NULL DEFAULT false,
  assigned_bdm uuid,
  dealer_id uuid REFERENCES public.dealers(id) ON DELETE SET NULL,
  signup_id uuid,
  last_attempt_at timestamptz, last_spoken_at timestamptz,
  last_outcome text,
  next_follow_up_at timestamptz, next_action text,
  latest_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bdm_d_stage ON public.bdm_dealerships(stage);
CREATE INDEX bdm_d_follow ON public.bdm_dealerships(next_follow_up_at);
CREATE INDEX bdm_d_assigned ON public.bdm_dealerships(assigned_bdm);
CREATE INDEX bdm_d_postcode ON public.bdm_dealerships(lower(postcode));
CREATE UNIQUE INDEX bdm_d_dealer ON public.bdm_dealerships(dealer_id) WHERE dealer_id IS NOT NULL;
CREATE UNIQUE INDEX bdm_d_signup ON public.bdm_dealerships(signup_id) WHERE signup_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.bdm_can_access(_dealership uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bdm_is_manager(auth.uid()) OR EXISTS (
    SELECT 1 FROM bdm_dealerships d WHERE d.id = _dealership AND bdm_is_staff(auth.uid())
      AND (d.assigned_bdm = auth.uid() OR d.created_by = auth.uid()));
$$;

CREATE TABLE public.bdm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.bdm_dealerships(id) ON DELETE CASCADE,
  full_name text NOT NULL, job_title text, phone text, mobile text, email text,
  is_primary boolean NOT NULL DEFAULT false, is_decision_maker boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bdm_c_d ON public.bdm_contacts(dealership_id);

CREATE TABLE public.bdm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.bdm_dealerships(id) ON DELETE CASCADE,
  bdm_user_id uuid, contact_name text,
  activity_type text NOT NULL, outcome text, notes text,
  next_action text, next_follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bdm_a_d ON public.bdm_activities(dealership_id, created_at DESC);

CREATE TABLE public.bdm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.bdm_dealerships(id) ON DELETE CASCADE,
  assigned_to uuid, due_at timestamptz NOT NULL, action text,
  status text NOT NULL DEFAULT 'open', completed_at timestamptz,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bdm_t_open ON public.bdm_tasks(status, due_at);

CREATE TABLE public.bdm_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.bdm_dealerships(id) ON DELETE CASCADE,
  from_stage text, to_stage text NOT NULL, changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bdm_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, file_name text,
  created_count int NOT NULL DEFAULT 0, updated_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0, failed_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bdm_import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.bdm_import_jobs(id) ON DELETE CASCADE,
  row_number int, error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bdm_export_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, format text NOT NULL, scope text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bdm_dealerships, public.bdm_contacts, public.bdm_tasks TO authenticated;
GRANT DELETE ON public.bdm_contacts TO authenticated;
GRANT SELECT, INSERT ON public.bdm_activities TO authenticated;
GRANT SELECT ON public.bdm_stage_history, public.bdm_import_jobs, public.bdm_import_errors, public.bdm_export_log TO authenticated;
GRANT ALL ON public.bdm_dealerships, public.bdm_contacts, public.bdm_activities, public.bdm_tasks, public.bdm_stage_history, public.bdm_import_jobs, public.bdm_import_errors, public.bdm_export_log TO service_role;

ALTER TABLE public.bdm_dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdm_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdm_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdm_import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdm_export_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BDM view dealerships" ON public.bdm_dealerships FOR SELECT TO authenticated
  USING (bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid()) AND (assigned_bdm = auth.uid() OR created_by = auth.uid())));
CREATE POLICY "BDM add dealerships" ON public.bdm_dealerships FOR INSERT TO authenticated
  WITH CHECK (bdm_is_staff(auth.uid()) AND created_by = auth.uid() AND (bdm_is_manager(auth.uid()) OR assigned_bdm IS NULL OR assigned_bdm = auth.uid()));
CREATE POLICY "BDM edit dealerships" ON public.bdm_dealerships FOR UPDATE TO authenticated
  USING (bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid()) AND (assigned_bdm = auth.uid() OR created_by = auth.uid())))
  WITH CHECK (bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid()) AND (assigned_bdm = auth.uid() OR (assigned_bdm IS NULL AND created_by = auth.uid()))));

CREATE POLICY "BDM contacts" ON public.bdm_contacts FOR ALL TO authenticated
  USING (bdm_can_access(dealership_id)) WITH CHECK (bdm_can_access(dealership_id));
CREATE POLICY "BDM view activities" ON public.bdm_activities FOR SELECT TO authenticated USING (bdm_can_access(dealership_id));
CREATE POLICY "BDM add activities" ON public.bdm_activities FOR INSERT TO authenticated WITH CHECK (bdm_can_access(dealership_id) AND bdm_user_id = auth.uid());
CREATE POLICY "BDM tasks" ON public.bdm_tasks FOR ALL TO authenticated
  USING (bdm_can_access(dealership_id)) WITH CHECK (bdm_can_access(dealership_id));
CREATE POLICY "BDM view stage history" ON public.bdm_stage_history FOR SELECT TO authenticated USING (bdm_can_access(dealership_id));
CREATE POLICY "Super admin import jobs" ON public.bdm_import_jobs FOR SELECT TO authenticated USING (bdm_is_super(auth.uid()));
CREATE POLICY "Super admin import errors" ON public.bdm_import_errors FOR SELECT TO authenticated USING (bdm_is_super(auth.uid()));
CREATE POLICY "Super admin export log" ON public.bdm_export_log FOR SELECT TO authenticated USING (bdm_is_super(auth.uid()));

-- Timestamps and stage audit
CREATE OR REPLACE FUNCTION public.bdm_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER bdm_d_touch BEFORE UPDATE ON public.bdm_dealerships FOR EACH ROW EXECUTE FUNCTION public.bdm_touch();
CREATE TRIGGER bdm_c_touch BEFORE UPDATE ON public.bdm_contacts FOR EACH ROW EXECUTE FUNCTION public.bdm_touch();

CREATE OR REPLACE FUNCTION public.bdm_stage_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO bdm_stage_history(dealership_id, from_stage, to_stage, changed_by) VALUES (NEW.id, NULL, NEW.stage, auth.uid());
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO bdm_stage_history(dealership_id, from_stage, to_stage, changed_by) VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER bdm_d_stage_audit AFTER INSERT OR UPDATE OF stage ON public.bdm_dealerships FOR EACH ROW EXECUTE FUNCTION public.bdm_stage_audit();

-- Log a call / activity in one step
CREATE OR REPLACE FUNCTION public.bdm_log_activity(
  p_dealership uuid, p_type text, p_outcome text, p_contact text, p_notes text,
  p_next_action text, p_follow_up timestamptz, p_assigned uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; d record; v_spoke boolean; v_stage text;
BEGIN
  IF NOT bdm_can_access(p_dealership) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO d FROM bdm_dealerships WHERE id = p_dealership;
  v_spoke := p_type = 'meeting' OR coalesce(p_outcome,'') IN ('spoke','interested','callback','info_requested','demo_booked','onboarding_agreed','not_interested');
  INSERT INTO bdm_activities(dealership_id, bdm_user_id, contact_name, activity_type, outcome, notes, next_action, next_follow_up_at)
  VALUES (p_dealership, auth.uid(), nullif(trim(p_contact),''), p_type, p_outcome, nullif(trim(p_notes),''), nullif(trim(p_next_action),''), p_follow_up)
  RETURNING id INTO v_id;
  -- Completing contact closes tasks that were due
  UPDATE bdm_tasks SET status = 'done', completed_at = now() WHERE dealership_id = p_dealership AND status = 'open' AND due_at <= now() + interval '1 day' AND p_type <> 'note';
  IF p_follow_up IS NOT NULL THEN
    INSERT INTO bdm_tasks(dealership_id, assigned_to, due_at, action, created_by)
    VALUES (p_dealership, coalesce(p_assigned, d.assigned_bdm, auth.uid()), p_follow_up, nullif(trim(p_next_action),''), auth.uid());
  END IF;
  v_stage := d.stage;
  IF d.stage NOT IN ('active_dealer') THEN
    v_stage := CASE
      WHEN p_outcome = 'not_interested' THEN 'not_interested'
      WHEN p_outcome = 'onboarding_agreed' THEN 'onboarding'
      WHEN p_outcome IN ('interested','demo_booked') AND d.stage IN ('new_lead','attempted','contacted','follow_up','not_interested') THEN 'interested'
      WHEN p_outcome IN ('callback','info_requested') AND d.stage IN ('new_lead','attempted','contacted') THEN 'follow_up'
      WHEN v_spoke AND d.stage IN ('new_lead','attempted') THEN 'contacted'
      WHEN p_outcome IN ('no_answer','voicemail') AND d.stage = 'new_lead' THEN 'attempted'
      ELSE d.stage END;
  END IF;
  UPDATE bdm_dealerships SET
    last_attempt_at = CASE WHEN p_type IN ('call','email','whatsapp','meeting') THEN now() ELSE last_attempt_at END,
    last_spoken_at = CASE WHEN v_spoke THEN now() ELSE last_spoken_at END,
    last_outcome = coalesce(p_outcome, last_outcome),
    latest_note = coalesce(nullif(trim(p_notes),''), latest_note),
    next_follow_up_at = (SELECT min(due_at) FROM bdm_tasks WHERE dealership_id = p_dealership AND status = 'open'),
    next_action = (SELECT action FROM bdm_tasks WHERE dealership_id = p_dealership AND status = 'open' ORDER BY due_at LIMIT 1),
    assigned_bdm = CASE WHEN p_assigned IS NOT NULL AND bdm_is_manager(auth.uid()) THEN p_assigned ELSE assigned_bdm END,
    stage = v_stage
  WHERE id = p_dealership;
  RETURN v_id;
END; $$;

-- KPIs for what the signed-in user can see
CREATE OR REPLACE FUNCTION public.bdm_kpis() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH v AS (
    SELECT * FROM bdm_dealerships d
    WHERE bdm_is_manager(auth.uid()) OR (bdm_is_staff(auth.uid()) AND (d.assigned_bdm = auth.uid() OR d.created_by = auth.uid()))
  ), b AS (SELECT (date_trunc('day', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London') AS today)
  SELECT jsonb_build_object(
    'due_today', (SELECT count(DISTINCT t.dealership_id) FROM bdm_tasks t JOIN v ON v.id = t.dealership_id, b WHERE t.status='open' AND NOT v.do_not_contact AND t.due_at >= b.today AND t.due_at < b.today + interval '1 day'),
    'overdue', (SELECT count(DISTINCT t.dealership_id) FROM bdm_tasks t JOIN v ON v.id = t.dealership_id, b WHERE t.status='open' AND NOT v.do_not_contact AND t.due_at < b.today),
    'interested', (SELECT count(*) FROM v WHERE stage = 'interested'),
    'onboarding', (SELECT count(*) FROM v WHERE stage = 'onboarding'),
    'activated', (SELECT count(*) FROM v WHERE v.dealer_id IS NOT NULL AND (
        SELECT min(c.created_at) FROM customers c WHERE c.dealer_id = v.dealer_id AND coalesce(c.status,'') NOT ILIKE 'cancel%') >= date_trunc('month', now()))
  ) WHERE bdm_is_staff(auth.uid());
$$;

-- Linked dealer account summary (reads existing records, nothing copied)
CREATE OR REPLACE FUNCTION public.bdm_account_summary(p_dealership uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d record; r jsonb;
BEGIN
  IF NOT bdm_can_access(p_dealership) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT dealer_id INTO d FROM bdm_dealerships WHERE id = p_dealership;
  IF d.dealer_id IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'dealer_id', x.id, 'company_name', x.company_name, 'status', x.status, 'registered_at', x.created_at,
    'first_warranty', (SELECT min(created_at) FROM customers WHERE dealer_id = x.id),
    'last_warranty', (SELECT max(created_at) FROM customers WHERE dealer_id = x.id),
    'this_month', (SELECT count(*) FROM customers WHERE dealer_id = x.id AND created_at >= date_trunc('month', now())),
    'total', (SELECT count(*) FROM customers WHERE dealer_id = x.id)
  ) INTO r FROM dealers x WHERE x.id = d.dealer_id;
  RETURN r;
END; $$;

-- Staff list for the "Assigned BDM" pickers
CREATE OR REPLACE FUNCTION public.bdm_staff_list() RETURNS TABLE(user_id uuid, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.user_id, trim(coalesce(a.first_name,'') || ' ' || coalesce(a.last_name,'')) || CASE WHEN coalesce(a.first_name,'') = '' THEN a.email ELSE '' END
  FROM admin_users a WHERE a.is_active AND a.user_id IS NOT NULL AND bdm_is_staff(auth.uid()) ORDER BY 2;
$$;

-- Super Admin only: full export (logged)
CREATE OR REPLACE FUNCTION public.bdm_export_full(p_format text, p_scope text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT bdm_is_super(auth.uid()) THEN RAISE EXCEPTION 'Only Super Admin can export CRM data'; END IF;
  INSERT INTO bdm_export_log(user_id, format, scope) VALUES (auth.uid(), left(p_format, 20), left(p_scope, 40));
  RETURN jsonb_build_object(
    'dealerships', coalesce((SELECT jsonb_agg(to_jsonb(d) - 'phone_digits' - 'website_domain' ORDER BY d.name) FROM bdm_dealerships d), '[]'),
    'contacts', CASE WHEN p_scope = 'full' THEN coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM bdm_contacts c), '[]') ELSE '[]' END,
    'activities', CASE WHEN p_scope = 'full' THEN coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at) FROM bdm_activities a), '[]') ELSE '[]' END,
    'tasks', CASE WHEN p_scope = 'full' THEN coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.due_at) FROM bdm_tasks t), '[]') ELSE '[]' END,
    'stage_history', CASE WHEN p_scope = 'full' THEN coalesce((SELECT jsonb_agg(to_jsonb(h) ORDER BY h.created_at) FROM bdm_stage_history h), '[]') ELSE '[]' END
  );
END; $$;

-- Super Admin only: import prepared rows. Blank values never clear data;
-- notes, history, assigned BDM and follow-ups on existing records are left alone.
CREATE OR REPLACE FUNCTION public.bdm_import_rows(p_file_name text, p_rows jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; f jsonb; v_job uuid; v_id uuid; n_c int := 0; n_u int := 0; n_s int := 0; n_f int := 0; i int := 0;
  v_int_stock int; v_int_sales int;
BEGIN
  IF NOT bdm_is_super(auth.uid()) THEN RAISE EXCEPTION 'Only Super Admin can import CRM data'; END IF;
  INSERT INTO bdm_import_jobs(user_id, file_name) VALUES (auth.uid(), left(p_file_name, 200)) RETURNING id INTO v_job;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    i := i + 1;
    f := r->'fields';
    BEGIN
      v_int_stock := nullif(f->>'vehicle_stock','')::int;
      v_int_sales := nullif(f->>'est_monthly_sales','')::int;
      IF r->>'action' = 'skip' THEN n_s := n_s + 1;
      ELSIF r->>'action' = 'update' THEN
        UPDATE bdm_dealerships SET
          name = coalesce(nullif(f->>'name',''), name), postcode = coalesce(nullif(upper(f->>'postcode'),''), postcode),
          town = coalesce(nullif(f->>'town',''), town), phone = coalesce(nullif(f->>'phone',''), phone),
          address = coalesce(nullif(f->>'address',''), address), county = coalesce(nullif(f->>'county',''), county),
          email = coalesce(nullif(f->>'email',''), email), website = coalesce(nullif(f->>'website',''), website),
          vehicle_stock = coalesce(v_int_stock, vehicle_stock),
          stock_updated_at = CASE WHEN v_int_stock IS NOT NULL THEN now() ELSE stock_updated_at END,
          est_monthly_sales = coalesce(v_int_sales, est_monthly_sales),
          current_provider = coalesce(nullif(f->>'current_provider',''), current_provider),
          lead_source = coalesce(nullif(f->>'lead_source',''), lead_source),
          priority = coalesce(nullif(f->>'priority',''), priority),
          do_not_contact = do_not_contact OR coalesce((f->>'do_not_contact')::boolean, false)
        WHERE id = (r->>'target_id')::uuid;
        IF NOT FOUND THEN RAISE EXCEPTION 'Existing record not found'; END IF;
        n_u := n_u + 1;
      ELSE
        IF coalesce(f->>'name','') = '' OR coalesce(f->>'postcode','') = '' OR coalesce(f->>'town','') = '' OR coalesce(f->>'phone','') = '' THEN
          RAISE EXCEPTION 'Missing dealership name, postcode, town or phone';
        END IF;
        INSERT INTO bdm_dealerships(name, postcode, town, phone, address, county, email, website, vehicle_stock, stock_updated_at,
          est_monthly_sales, current_provider, lead_source, priority, stage, do_not_contact, assigned_bdm, dealer_id,
          last_attempt_at, last_spoken_at, last_outcome, latest_note, next_follow_up_at, next_action, created_by)
        VALUES (f->>'name', upper(f->>'postcode'), f->>'town', f->>'phone', nullif(f->>'address',''), nullif(f->>'county',''),
          nullif(f->>'email',''), nullif(f->>'website',''), v_int_stock, CASE WHEN v_int_stock IS NOT NULL THEN now() END,
          v_int_sales, nullif(f->>'current_provider',''), coalesce(nullif(f->>'lead_source',''), 'Import'),
          coalesce(nullif(f->>'priority',''), 'medium'), coalesce(nullif(f->>'stage',''), 'new_lead'),
          coalesce((f->>'do_not_contact')::boolean, false), nullif(f->>'assigned_bdm','')::uuid,
          (SELECT id FROM dealers WHERE id::text = f->>'dealer_id'),
          nullif(f->>'last_attempt_at','')::timestamptz, nullif(f->>'last_spoken_at','')::timestamptz, nullif(f->>'last_outcome',''),
          nullif(f->>'latest_note',''), nullif(f->>'next_follow_up_at','')::timestamptz, nullif(f->>'next_action',''), auth.uid())
        RETURNING id INTO v_id;
        IF coalesce(f->>'contact_name','') <> '' THEN
          INSERT INTO bdm_contacts(dealership_id, full_name, job_title, mobile, email, is_primary)
          VALUES (v_id, f->>'contact_name', nullif(f->>'job_title',''), nullif(f->>'contact_mobile',''), nullif(f->>'contact_email',''), true);
        END IF;
        IF coalesce(f->>'latest_note','') <> '' THEN
          INSERT INTO bdm_activities(dealership_id, bdm_user_id, activity_type, notes) VALUES (v_id, auth.uid(), 'note', 'Imported note: ' || (f->>'latest_note'));
        END IF;
        IF nullif(f->>'next_follow_up_at','') IS NOT NULL THEN
          INSERT INTO bdm_tasks(dealership_id, assigned_to, due_at, action, created_by)
          VALUES (v_id, nullif(f->>'assigned_bdm','')::uuid, (f->>'next_follow_up_at')::timestamptz, nullif(f->>'next_action',''), auth.uid());
        END IF;
        n_c := n_c + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      n_f := n_f + 1;
      INSERT INTO bdm_import_errors(job_id, row_number, error) VALUES (v_job, coalesce((r->>'row')::int, i), SQLERRM);
    END;
  END LOOP;
  UPDATE bdm_import_jobs SET created_count = n_c, updated_count = n_u, skipped_count = n_s, failed_count = n_f WHERE id = v_job;
  RETURN jsonb_build_object('job_id', v_job, 'created', n_c, 'updated', n_u, 'skipped', n_s, 'failed', n_f,
    'errors', coalesce((SELECT jsonb_agg(jsonb_build_object('row', row_number, 'error', error) ORDER BY row_number) FROM bdm_import_errors WHERE job_id = v_job), '[]'));
END; $$;

-- Sign-ups and dealer accounts flow into the contact list automatically
CREATE OR REPLACE FUNCTION public.bdm_sync_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM bdm_dealerships WHERE signup_id = NEW.id OR (NEW.dealer_id IS NOT NULL AND dealer_id = NEW.dealer_id) LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO bdm_dealerships(name, phone, email, est_monthly_sales, current_provider, lead_source, stage, signup_id, dealer_id, latest_note)
    VALUES (coalesce(nullif(NEW.dealership_name,''), 'Unnamed dealership'), NEW.phone_number, NEW.email_address,
      CASE WHEN NEW.monthly_vehicle_sales ~ '^\d+$' THEN NEW.monthly_vehicle_sales::int END,
      NEW.current_warranty_provider, 'Website sign-up',
      CASE WHEN NEW.dealer_id IS NOT NULL THEN 'onboarding' ELSE 'new_lead' END, NEW.id,
      (SELECT id FROM dealers WHERE id = NEW.dealer_id), nullif(NEW.additional_information,''))
    RETURNING id INTO v_id;
    IF coalesce(NEW.contact_name,'') <> '' THEN
      INSERT INTO bdm_contacts(dealership_id, full_name, phone, email, is_primary, is_decision_maker)
      VALUES (v_id, NEW.contact_name, NEW.phone_number, NEW.email_address, true, true);
    END IF;
  ELSIF NEW.dealer_id IS NOT NULL THEN
    UPDATE bdm_dealerships SET dealer_id = coalesce(dealer_id, NEW.dealer_id), signup_id = coalesce(signup_id, NEW.id),
      stage = CASE WHEN stage IN ('active_dealer') THEN stage ELSE 'onboarding' END
    WHERE id = v_id AND (dealer_id IS NULL OR dealer_id = NEW.dealer_id)
      AND NOT EXISTS (SELECT 1 FROM bdm_dealerships o WHERE o.dealer_id = NEW.dealer_id AND o.id <> v_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER bdm_sync_signup AFTER INSERT OR UPDATE OF dealer_id ON public.trade_warranty_signups FOR EACH ROW EXECUTE FUNCTION public.bdm_sync_signup();

CREATE OR REPLACE FUNCTION public.bdm_sync_dealer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM bdm_dealerships WHERE dealer_id = NEW.id) THEN RETURN NEW; END IF;
  UPDATE bdm_dealerships SET dealer_id = NEW.id, stage = CASE WHEN stage = 'active_dealer' THEN stage ELSE 'onboarding' END
  WHERE id = (SELECT id FROM bdm_dealerships WHERE dealer_id IS NULL AND email IS NOT NULL AND lower(email) = lower(NEW.email) LIMIT 1);
  IF NOT FOUND THEN
    INSERT INTO bdm_dealerships(name, address, town, county, postcode, phone, email, lead_source, stage, dealer_id)
    VALUES (coalesce(nullif(NEW.company_name,''), NEW.name), NEW.address_line1, NEW.city, NEW.county, upper(NEW.postcode), NEW.phone, NEW.email,
      'Dealer account', 'onboarding', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER bdm_sync_dealer AFTER INSERT ON public.dealers FOR EACH ROW EXECUTE FUNCTION public.bdm_sync_dealer();

-- Backfill existing sign-ups and dealer accounts
DO $$ DECLARE s record; d record; BEGIN
  FOR s IN SELECT * FROM trade_warranty_signups ORDER BY created_at LOOP
    PERFORM 1; UPDATE trade_warranty_signups SET dealer_id = dealer_id WHERE id = s.id AND false;
  END LOOP;
END $$;
INSERT INTO bdm_dealerships(name, phone, email, est_monthly_sales, current_provider, lead_source, stage, signup_id, dealer_id, latest_note, created_at)
SELECT DISTINCT ON (coalesce(s.dealer_id::text, s.id::text))
  coalesce(nullif(s.dealership_name,''), 'Unnamed dealership'), s.phone_number, s.email_address,
  CASE WHEN s.monthly_vehicle_sales ~ '^\d+$' THEN s.monthly_vehicle_sales::int END,
  s.current_warranty_provider, 'Website sign-up',
  CASE WHEN s.dealer_id IS NOT NULL THEN 'onboarding' WHEN s.status IN ('rejected') THEN 'not_interested' ELSE 'new_lead' END,
  s.id, (SELECT id FROM dealers WHERE id = s.dealer_id), nullif(s.additional_information,''), s.created_at
FROM trade_warranty_signups s ORDER BY coalesce(s.dealer_id::text, s.id::text), s.created_at DESC;
INSERT INTO bdm_contacts(dealership_id, full_name, phone, email, is_primary, is_decision_maker)
SELECT b.id, s.contact_name, s.phone_number, s.email_address, true, true
FROM bdm_dealerships b JOIN trade_warranty_signups s ON s.id = b.signup_id WHERE coalesce(s.contact_name,'') <> '';
INSERT INTO bdm_dealerships(name, address, town, county, postcode, phone, email, lead_source, stage, dealer_id, created_at)
SELECT coalesce(nullif(x.company_name,''), x.name), x.address_line1, x.city, x.county, upper(x.postcode), x.phone, x.email, 'Dealer account',
  CASE WHEN EXISTS (SELECT 1 FROM customers c WHERE c.dealer_id = x.id) THEN 'active_dealer' ELSE 'onboarding' END, x.id, x.created_at
FROM dealers x WHERE NOT EXISTS (SELECT 1 FROM bdm_dealerships b WHERE b.dealer_id = x.id);
UPDATE bdm_dealerships b SET stage = 'active_dealer'
WHERE b.dealer_id IS NOT NULL AND EXISTS (SELECT 1 FROM customers c WHERE c.dealer_id = b.dealer_id) AND b.stage <> 'active_dealer';
UPDATE bdm_dealerships b SET town = coalesce(b.town, x.city), postcode = coalesce(b.postcode, upper(x.postcode)), address = coalesce(b.address, x.address_line1)
FROM dealers x WHERE x.id = b.dealer_id;

REVOKE EXECUTE ON FUNCTION public.bdm_export_full(text, text), public.bdm_import_rows(text, jsonb), public.bdm_log_activity(uuid, text, text, text, text, text, timestamptz, uuid), public.bdm_kpis(), public.bdm_account_summary(uuid), public.bdm_staff_list() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bdm_export_full(text, text), public.bdm_import_rows(text, jsonb), public.bdm_log_activity(uuid, text, text, text, text, text, timestamptz, uuid), public.bdm_kpis(), public.bdm_account_summary(uuid), public.bdm_staff_list() TO authenticated;