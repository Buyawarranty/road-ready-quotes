GRANT SELECT, INSERT ON public.dealer_admin_claims TO authenticated;

CREATE POLICY "Dealers can view own claims"
ON public.dealer_admin_claims
FOR SELECT
TO authenticated
USING (dealer_id IN (SELECT d.id FROM public.dealers d WHERE d.user_id = (SELECT auth.uid())));

CREATE POLICY "Dealers can submit own claims"
ON public.dealer_admin_claims
FOR INSERT
TO authenticated
WITH CHECK (dealer_id IN (SELECT d.id FROM public.dealers d WHERE d.user_id = (SELECT auth.uid())));