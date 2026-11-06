CREATE TABLE public.view_as_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_user_id uuid NOT NULL,
  viewer_email text,
  target_admin_user_id uuid NOT NULL,
  target_name text,
  target_email text,
  target_role text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.view_as_audit_log TO authenticated;
GRANT ALL ON public.view_as_audit_log TO service_role;
ALTER TABLE public.view_as_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read view-as log" ON public.view_as_audit_log
  FOR SELECT TO authenticated USING (public.bdm_is_super(auth.uid()));
CREATE INDEX view_as_audit_log_started_idx ON public.view_as_audit_log (started_at DESC);

CREATE OR REPLACE FUNCTION public.start_view_as_session(_target_admin_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _t record;
BEGIN
  IF NOT public.bdm_is_super(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT first_name, last_name, email, role INTO _t FROM admin_users WHERE id = _target_admin_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff member not found'; END IF;
  -- close any session left open by this viewer
  UPDATE view_as_audit_log SET ended_at = now() WHERE viewer_user_id = auth.uid() AND ended_at IS NULL;
  INSERT INTO view_as_audit_log (viewer_user_id, viewer_email, target_admin_user_id, target_name, target_email, target_role)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), _target_admin_user_id,
          trim(coalesce(_t.first_name,'') || ' ' || coalesce(_t.last_name,'')), _t.email, _t.role::text)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.end_view_as_session(_session_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE view_as_audit_log SET ended_at = now()
  WHERE viewer_user_id = auth.uid() AND ended_at IS NULL
    AND (_session_id IS NULL OR id = _session_id);
END $$;

REVOKE ALL ON FUNCTION public.start_view_as_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.end_view_as_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_view_as_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_view_as_session(uuid) TO authenticated;