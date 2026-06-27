GRANT INSERT ON public.trade_warranty_signups TO anon, authenticated;
ALTER TABLE public.trade_warranty_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit a trade warranty signup" ON public.trade_warranty_signups;
CREATE POLICY "Anyone can submit a trade warranty signup"
  ON public.trade_warranty_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);