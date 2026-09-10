CREATE TABLE public.dealer_quote_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  term_months INTEGER NOT NULL DEFAULT 12,
  excess INTEGER NOT NULL DEFAULT 50,
  labour INTEGER NOT NULL DEFAULT 70,
  parts TEXT NOT NULL DEFAULT 'age_mileage',
  claim_limit INTEGER NOT NULL DEFAULT 1000,
  plan_type TEXT NOT NULL DEFAULT 'gold',
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dealer_quote_templates TO authenticated;
GRANT ALL ON public.dealer_quote_templates TO service_role;

ALTER TABLE public.dealer_quote_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Traders manage their own quote templates"
ON public.dealer_quote_templates
FOR ALL
TO authenticated
USING (dealer_id = public.current_dealer_id())
WITH CHECK (dealer_id = public.current_dealer_id());

CREATE INDEX idx_dealer_quote_templates_dealer ON public.dealer_quote_templates (dealer_id, created_at DESC);

CREATE TRIGGER update_dealer_quote_templates_updated_at
BEFORE UPDATE ON public.dealer_quote_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();