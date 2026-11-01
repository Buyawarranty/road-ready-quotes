CREATE TABLE public.dealer_paylater_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  unlock_rule text NOT NULL DEFAULT 'paid_warranties',
  required_paid_warranties int NOT NULL DEFAULT 1,
  payment_term_days int NOT NULL DEFAULT 30,
  block_on_overdue boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.dealer_paylater_settings TO authenticated;
GRANT ALL ON public.dealer_paylater_settings TO service_role;
ALTER TABLE public.dealer_paylater_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pay later settings" ON public.dealer_paylater_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.dealer_paylater_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.dealer_paylater_overrides (
  dealer_id uuid PRIMARY KEY REFERENCES public.dealers(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'auto',
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dealer_paylater_overrides TO authenticated;
GRANT ALL ON public.dealer_paylater_overrides TO service_role;
ALTER TABLE public.dealer_paylater_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pay later overrides" ON public.dealer_paylater_overrides FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_dealer_paylater_eligibility(p_dealer_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; v_mode text; v_paid int; v_overdue int; v_reason text := null;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR p_dealer_id = public.current_dealer_id()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  SELECT * INTO s FROM dealer_paylater_settings WHERE id = 1;
  SELECT mode INTO v_mode FROM dealer_paylater_overrides WHERE dealer_id = p_dealer_id;
  SELECT count(*) INTO v_paid FROM customers WHERE dealer_id = p_dealer_id AND payment_status = 'paid';
  SELECT count(*) INTO v_overdue FROM customers WHERE dealer_id = p_dealer_id
    AND coalesce(payment_status,'') NOT IN ('paid','cancelled','refunded')
    AND signup_date < now() - make_interval(days => s.payment_term_days);
  IF v_mode = 'block' THEN v_reason := 'blocked';
  ELSIF v_mode = 'allow' THEN v_reason := null;
  ELSIF s.block_on_overdue AND v_overdue > 0 THEN v_reason := 'overdue';
  ELSIF s.unlock_rule = 'paid_warranties' AND v_paid < s.required_paid_warranties THEN v_reason := 'new';
  ELSIF s.unlock_rule = 'disabled' THEN v_reason := 'blocked';
  END IF;
  RETURN jsonb_build_object('eligible', v_reason IS NULL, 'reason', v_reason, 'paid_count', v_paid,
    'required', s.required_paid_warranties, 'term_days', s.payment_term_days, 'overdue_count', v_overdue,
    'mode', coalesce(v_mode,'auto'));
END $$;
GRANT EXECUTE ON FUNCTION public.get_dealer_paylater_eligibility(uuid) TO authenticated;