CREATE POLICY "Dealers can view their own orders"
ON public.dealer_admin_orders
FOR SELECT
TO authenticated
USING (dealer_id = public.current_dealer_id());