ALTER TABLE public.bumper_transactions ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT 'buyawarranty';
ALTER TABLE public.payment_assist_transactions ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT 'buyawarranty';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bumper_transactions_brand_check') THEN
    ALTER TABLE public.bumper_transactions ADD CONSTRAINT bumper_transactions_brand_check CHECK (brand IN ('buyawarranty','pandaprotect'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_assist_transactions_brand_check') THEN
    ALTER TABLE public.payment_assist_transactions ADD CONSTRAINT payment_assist_transactions_brand_check CHECK (brand IN ('buyawarranty','pandaprotect'));
  END IF;
END $$;