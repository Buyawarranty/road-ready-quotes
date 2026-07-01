
CREATE TABLE public.callrail_tracking_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  callrail_tracker_id text UNIQUE NOT NULL,
  phone_e164 text,
  label text,
  assigned_admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.callrail_tracking_numbers TO authenticated;
GRANT ALL ON public.callrail_tracking_numbers TO service_role;

ALTER TABLE public.callrail_tracking_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tracking numbers"
  ON public.callrail_tracking_numbers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage tracking numbers"
  ON public.callrail_tracking_numbers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.callrail_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  callrail_call_id text UNIQUE NOT NULL,
  direction text NOT NULL DEFAULT 'inbound',
  status text NOT NULL DEFAULT 'ringing',
  caller_number text,
  caller_name text,
  caller_city text,
  caller_state text,
  tracker_id text,
  tracked_number text,
  tracking_number_id uuid REFERENCES public.callrail_tracking_numbers(id) ON DELETE SET NULL,
  assigned_admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  matched_lead_id uuid,
  matched_customer_id uuid,
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  recording_url text,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  callback_lead_id uuid,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_callrail_calls_assigned ON public.callrail_calls(assigned_admin_user_id);
CREATE INDEX idx_callrail_calls_status ON public.callrail_calls(status);
CREATE INDEX idx_callrail_calls_started ON public.callrail_calls(started_at DESC);
CREATE INDEX idx_callrail_calls_ack ON public.callrail_calls(acknowledged_at) WHERE acknowledged_at IS NULL;

GRANT SELECT, UPDATE ON public.callrail_calls TO authenticated;
GRANT ALL ON public.callrail_calls TO service_role;

ALTER TABLE public.callrail_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and assigned agents view calls"
  ON public.callrail_calls FOR SELECT TO authenticated
  USING (
    public.is_admin_or_sales(auth.uid())
    AND (
      public.is_admin(auth.uid())
      OR assigned_admin_user_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.admin_users au
        WHERE au.user_id = auth.uid() AND au.id = callrail_calls.assigned_admin_user_id
      )
    )
  );

CREATE POLICY "Admins and assigned agents update calls"
  ON public.callrail_calls FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.id = callrail_calls.assigned_admin_user_id
    )
  )
  WITH CHECK (true);

CREATE TRIGGER trg_callrail_tracking_numbers_updated
  BEFORE UPDATE ON public.callrail_tracking_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_callrail_calls_updated
  BEFORE UPDATE ON public.callrail_calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.callrail_calls REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.callrail_calls;
