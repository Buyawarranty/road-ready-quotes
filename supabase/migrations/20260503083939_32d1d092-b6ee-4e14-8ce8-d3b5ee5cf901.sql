CREATE TABLE public.trader_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('base','excess','labour','parts','claim','term','dealer_pct','vat')),
  option_key text NOT NULL,
  option_label text,
  multiplier numeric NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, option_key)
);

ALTER TABLE public.trader_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read trader pricing"
  ON public.trader_pricing_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage trader pricing"
  ON public.trader_pricing_config FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_trader_pricing_updated
  BEFORE UPDATE ON public.trader_pricing_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.trader_pricing_config (category, option_key, option_label, multiplier) VALUES
  ('base','gold','Gold base price', 147.50),
  ('excess','0','£0', 1.10),
  ('excess','50','£50', 1.00),
  ('excess','75','£75', 0.90),
  ('excess','100','£100', 0.87),
  ('excess','150','£150', 0.83),
  ('labour','40','£40/hr', 0.90),
  ('labour','50','£50/hr', 0.95),
  ('labour','70','£70/hr', 1.00),
  ('labour','100','£100/hr', 1.10),
  ('labour','120','£120/hr', 1.20),
  ('labour','200','£200/hr', 1.50),
  ('parts','age_mileage','Age & Mileage', 1.00),
  ('parts','none','No contribution', 1.20),
  ('claim','750','£750', 0.85),
  ('claim','1000','£1,000', 1.00),
  ('claim','1250','£1,250', 1.10),
  ('claim','2000','£2,000', 1.30),
  ('term','3','3 months', 0.6),
  ('term','6','6 months', 0.8),
  ('term','12','12 months', 1.0),
  ('term','24','24 months', 1.8),
  ('term','36','36 months', 2.6),
  ('dealer_pct','default','Dealer pay %', 0.80),
  ('vat','default','VAT', 1.20);