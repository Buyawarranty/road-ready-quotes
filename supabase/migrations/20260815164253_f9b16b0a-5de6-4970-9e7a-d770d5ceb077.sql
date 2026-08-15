GRANT SELECT ON public.dealer_customers TO authenticated;

DROP POLICY IF EXISTS "Dealers can view their own customers" ON public.dealer_customers;
CREATE POLICY "Dealers can view their own customers"
ON public.dealer_customers
FOR SELECT
TO authenticated
USING (dealer_id = public.current_dealer_id());