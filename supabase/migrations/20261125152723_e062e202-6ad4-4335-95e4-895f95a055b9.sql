CREATE OR REPLACE FUNCTION public.sync_panda_terminal_cover_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text := lower(btrim(NEW.status));
BEGIN
  IF NEW.brand IS DISTINCT FROM 'pandaprotect' OR v_status IS NULL OR v_status NOT IN ('cancelled', 'refunded', 'expired') THEN RETURN NEW; END IF;
  UPDATE public.customer_policies
    SET status = CASE WHEN v_status = 'refunded' THEN 'cancelled' ELSE v_status END, updated_at = now()
    WHERE customer_id = NEW.id
      AND status IS DISTINCT FROM CASE WHEN v_status = 'refunded' THEN 'cancelled' ELSE v_status END;
  UPDATE public.dealer_warranties
    SET status = v_status
    WHERE customer_id = NEW.id AND dealer_id = NEW.dealer_id
      AND status IS DISTINCT FROM v_status;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_panda_terminal_cover_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_panda_terminal_cover_status() TO service_role;