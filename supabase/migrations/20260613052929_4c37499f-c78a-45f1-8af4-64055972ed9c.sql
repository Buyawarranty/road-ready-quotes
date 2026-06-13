GRANT INSERT ON public.trade_warranty_signups TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.trade_warranty_signups TO authenticated;
GRANT ALL ON public.trade_warranty_signups TO service_role;