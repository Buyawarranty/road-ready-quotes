ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT 'buyawarranty';
ALTER TABLE public.abandoned_carts ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT 'buyawarranty';
ALTER TABLE public.claims_submissions ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT 'buyawarranty';
ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT 'buyawarranty';
ALTER TABLE public.live_quotes ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT 'buyawarranty';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_brand_check') THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_brand_check CHECK (brand IN ('buyawarranty','pandaprotect'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'abandoned_carts_brand_check') THEN
    ALTER TABLE public.abandoned_carts ADD CONSTRAINT abandoned_carts_brand_check CHECK (brand IN ('buyawarranty','pandaprotect'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claims_submissions_brand_check') THEN
    ALTER TABLE public.claims_submissions ADD CONSTRAINT claims_submissions_brand_check CHECK (brand IN ('buyawarranty','pandaprotect'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_submissions_brand_check') THEN
    ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_brand_check CHECK (brand IN ('buyawarranty','pandaprotect'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_quotes_brand_check') THEN
    ALTER TABLE public.live_quotes ADD CONSTRAINT live_quotes_brand_check CHECK (brand IN ('buyawarranty','pandaprotect'));
  END IF;
END $$;

UPDATE public.customers SET brand = 'pandaprotect' WHERE dealer_id IS NOT NULL AND brand <> 'pandaprotect';

CREATE INDEX IF NOT EXISTS idx_customers_brand ON public.customers(brand);