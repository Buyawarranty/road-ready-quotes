
-- Step 3: webhook delivery log
CREATE TABLE IF NOT EXISTS public.api_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.api_webhook_endpoints(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|success|failed
  response_status integer,
  response_body text,
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.api_webhook_deliveries TO authenticated;
GRANT ALL ON public.api_webhook_deliveries TO service_role;

ALTER TABLE public.api_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers view their own webhook deliveries"
  ON public.api_webhook_deliveries FOR SELECT TO authenticated
  USING (dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_dealer ON public.api_webhook_deliveries(dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON public.api_webhook_deliveries(endpoint_id, created_at DESC);

-- Step 4: sandbox/live mode
ALTER TABLE public.dealer_api_keys ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'live' CHECK (mode IN ('live','test'));
ALTER TABLE public.dealer_warranties ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.dealer_quotes ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dealer_warranties_test ON public.dealer_warranties(dealer_id, is_test);
CREATE INDEX IF NOT EXISTS idx_dealer_quotes_test ON public.dealer_quotes(dealer_id, is_test);
