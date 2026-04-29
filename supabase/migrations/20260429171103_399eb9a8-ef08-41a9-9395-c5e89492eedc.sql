
-- DEALER ADMIN QUOTES
CREATE TABLE public.dealer_admin_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  dealer_name TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_email_normalized TEXT GENERATED ALWAYS AS (lower(trim(customer_email))) STORED,
  customer_phone TEXT,
  vehicle_reg TEXT,
  vehicle_reg_normalized TEXT GENERATED ALWAYS AS (upper(regexp_replace(coalesce(vehicle_reg,''), '\s+', '', 'g'))) STORED,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year TEXT,
  vehicle_mileage INTEGER,
  plan_type TEXT,
  duration_months INTEGER,
  retail_price NUMERIC(10,2),
  dealer_price NUMERIC(10,2),
  discount_pct NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_admin_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dealer admin quotes" ON public.dealer_admin_quotes FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert dealer admin quotes" ON public.dealer_admin_quotes FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update dealer admin quotes" ON public.dealer_admin_quotes FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete dealer admin quotes" ON public.dealer_admin_quotes FOR DELETE USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_dealer_admin_quotes_updated_at
BEFORE UPDATE ON public.dealer_admin_quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dealer_admin_quotes_dealer ON public.dealer_admin_quotes(dealer_id);
CREATE INDEX idx_dealer_admin_quotes_status ON public.dealer_admin_quotes(status);
CREATE INDEX idx_dealer_admin_quotes_email_norm ON public.dealer_admin_quotes(customer_email_normalized);
CREATE INDEX idx_dealer_admin_quotes_reg_norm ON public.dealer_admin_quotes(vehicle_reg_normalized);

-- DEALER ADMIN ORDERS
CREATE TABLE public.dealer_admin_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.dealer_admin_quotes(id) ON DELETE SET NULL,
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  dealer_name TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_email_normalized TEXT GENERATED ALWAYS AS (lower(trim(customer_email))) STORED,
  customer_phone TEXT,
  vehicle_reg TEXT,
  vehicle_reg_normalized TEXT GENERATED ALWAYS AS (upper(regexp_replace(coalesce(vehicle_reg,''), '\s+', '', 'g'))) STORED,
  vehicle_make TEXT,
  vehicle_model TEXT,
  plan_type TEXT,
  duration_months INTEGER,
  amount_paid NUMERIC(10,2),
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_admin_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dealer admin orders" ON public.dealer_admin_orders FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert dealer admin orders" ON public.dealer_admin_orders FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update dealer admin orders" ON public.dealer_admin_orders FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete dealer admin orders" ON public.dealer_admin_orders FOR DELETE USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_dealer_admin_orders_updated_at
BEFORE UPDATE ON public.dealer_admin_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dealer_admin_orders_dealer ON public.dealer_admin_orders(dealer_id);
CREATE INDEX idx_dealer_admin_orders_quote ON public.dealer_admin_orders(quote_id);
CREATE INDEX idx_dealer_admin_orders_status ON public.dealer_admin_orders(status);
CREATE INDEX idx_dealer_admin_orders_payment ON public.dealer_admin_orders(payment_status);
