CREATE POLICY "Dealers can replay their own webhook deliveries"
ON public.api_webhook_deliveries
FOR UPDATE
TO authenticated
USING (dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()))
WITH CHECK (dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()));