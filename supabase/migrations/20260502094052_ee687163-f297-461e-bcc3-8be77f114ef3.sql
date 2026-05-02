-- Allow admin users to view all dealers (for the Dealer Admin dashboard)
CREATE POLICY "Admins can view all dealers"
ON public.dealers
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));