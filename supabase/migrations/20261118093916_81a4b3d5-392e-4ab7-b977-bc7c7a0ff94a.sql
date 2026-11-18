GRANT SELECT, UPDATE ON public.dealer_warranty_email_templates TO authenticated;

CREATE POLICY "Admins can read dealer warranty email wording"
ON public.dealer_warranty_email_templates
FOR SELECT
TO authenticated
USING (public.bdm_is_town_admin(auth.uid()));

CREATE POLICY "Admins can update dealer warranty email wording"
ON public.dealer_warranty_email_templates
FOR UPDATE
TO authenticated
USING (public.bdm_is_town_admin(auth.uid()))
WITH CHECK (public.bdm_is_town_admin(auth.uid()));