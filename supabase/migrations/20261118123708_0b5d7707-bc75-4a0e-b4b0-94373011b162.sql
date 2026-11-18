CREATE OR REPLACE FUNCTION public.generate_warranty_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN 'PP-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYMM') || '-' || LPAD(public.get_next_warranty_serial()::text, 6, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.generate_admin_warranty_number()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.generate_warranty_number();
$$;

CREATE OR REPLACE FUNCTION public.set_warranty_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.warranty_number IS NULL THEN
    NEW.warranty_number := public.generate_warranty_number();
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.set_customer_warranty_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.warranty_number IS NULL THEN
    NEW.warranty_number := COALESCE(NEW.warranty_reference_number, public.generate_warranty_number());
  END IF;
  IF NEW.warranty_reference_number IS NULL THEN
    NEW.warranty_reference_number := NEW.warranty_number;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_customer_warranty_number ON public.customers;
CREATE TRIGGER trg_set_customer_warranty_number BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_customer_warranty_number();

DO $$
DECLARE r record; n text;
BEGIN
  FOR r IN SELECT id, COALESCE(signup_date, created_at) d FROM public.customers WHERE warranty_number IS NULL ORDER BY created_at LOOP
    n := 'PP-' || TO_CHAR(r.d AT TIME ZONE 'UTC', 'YYMM') || '-' || LPAD(public.get_next_warranty_serial()::text, 6, '0');
    UPDATE public.customers SET warranty_number = n, warranty_reference_number = n WHERE id = r.id;
  END LOOP;
END $$;