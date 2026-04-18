ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_status text;
CREATE INDEX IF NOT EXISTS idx_customers_payment_status ON public.customers(payment_status);
COMMENT ON COLUMN public.customers.payment_status IS 'paid | invoice_pending | pending — used by dealer flow to track outstanding invoices';