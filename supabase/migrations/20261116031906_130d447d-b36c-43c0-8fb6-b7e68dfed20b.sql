DROP POLICY "Admins manage pay later settings" ON public.dealer_paylater_settings;
CREATE POLICY "Admins manage pay later settings" ON public.dealer_paylater_settings
  FOR ALL TO authenticated
  USING (private.can_authorize_dealer_credit(auth.uid()))
  WITH CHECK (private.can_authorize_dealer_credit(auth.uid()));

DROP POLICY "Admins manage pay later overrides" ON public.dealer_paylater_overrides;
CREATE POLICY "Admins manage pay later overrides" ON public.dealer_paylater_overrides
  FOR ALL TO authenticated
  USING (private.can_authorize_dealer_credit(auth.uid()))
  WITH CHECK (private.can_authorize_dealer_credit(auth.uid()));
