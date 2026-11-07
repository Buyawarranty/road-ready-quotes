ALTER TABLE public.customers DROP CONSTRAINT customers_status_check;
ALTER TABLE public.customers ADD CONSTRAINT customers_status_check CHECK (
  status = ANY (ARRAY['Active'::text, 'Cancelled'::text])
  OR (
    status = 'Pending'
    AND brand IS NOT DISTINCT FROM 'pandaprotect'
    AND purchase_source IS NOT DISTINCT FROM 'dealer'
    AND payment_status IS NOT DISTINCT FROM 'pending'
    AND payment_verified IS NOT DISTINCT FROM false
  )
);