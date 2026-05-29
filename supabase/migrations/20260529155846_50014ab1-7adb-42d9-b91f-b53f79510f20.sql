
-- Add sandbox flag to claims
ALTER TABLE public.dealer_admin_claims
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_dealer_admin_claims_dealer_test
  ON public.dealer_admin_claims (dealer_id, is_test);

-- Retry tracking columns on deliveries
ALTER TABLE public.api_webhook_deliveries
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 6;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry
  ON public.api_webhook_deliveries (status, next_retry_at)
  WHERE status = 'failed';

-- Schedule retry every minute (uses pg_cron + pg_net already enabled)
DO $$
DECLARE
  job_id INTEGER;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'dealer-webhook-retry';
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'dealer-webhook-retry',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mzlpuxzwyrcyrgrongeb.supabase.co/functions/v1/dealer-webhook-retry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
