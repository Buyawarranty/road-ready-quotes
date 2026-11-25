CREATE OR REPLACE FUNCTION public.sync_panda_terminal_cover_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text := lower(btrim(NEW.status));
BEGIN
  IF NEW.brand IS DISTINCT FROM 'pandaprotect' OR v_status NOT IN ('cancelled', 'refunded', 'expired') THEN RETURN NEW; END IF;
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
CREATE TRIGGER trg_sync_panda_terminal_cover_status
AFTER UPDATE OF status ON public.customers FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.sync_panda_terminal_cover_status();

CREATE OR REPLACE FUNCTION public.guard_panda_terminal_cover_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  SELECT lower(btrim(status)) INTO v_status FROM public.customers
    WHERE id = NEW.customer_id AND brand = 'pandaprotect';
  IF v_status IN ('cancelled', 'refunded', 'expired') THEN
    NEW.status := CASE WHEN TG_TABLE_NAME = 'customer_policies' AND v_status = 'refunded' THEN 'cancelled' ELSE v_status END;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_panda_terminal_cover_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_panda_terminal_cover_status() TO service_role;
CREATE TRIGGER trg_guard_panda_portal_terminal_status
BEFORE INSERT OR UPDATE OF status, customer_id ON public.customer_policies
FOR EACH ROW EXECUTE FUNCTION public.guard_panda_terminal_cover_status();
CREATE TRIGGER trg_guard_panda_dealer_terminal_status
BEFORE INSERT OR UPDATE OF status, customer_id ON public.dealer_warranties
FOR EACH ROW EXECUTE FUNCTION public.guard_panda_terminal_cover_status();

-- Only the reported cancelled cover is repaired; no other historic records are reconciled.
DO $$
DECLARE v_customer_before jsonb; v_quote_before jsonb; v_replacements_before jsonb;
BEGIN
  SELECT to_jsonb(c) INTO v_customer_before FROM public.customers c WHERE id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6';
  IF v_customer_before->>'brand' IS DISTINCT FROM 'pandaprotect'
     OR lower(v_customer_before->>'status') IS DISTINCT FROM 'cancelled'
     OR v_customer_before->>'warranty_number' IS DISTINCT FROM 'PP-2611-402020' THEN
    RAISE EXCEPTION 'Reported warranty cancellation could not be confirmed';
  END IF;
  SELECT jsonb_agg(to_jsonb(q) ORDER BY q.id) INTO v_quote_before FROM public.dealer_quotes q
    WHERE id IN (SELECT quote_id FROM public.dealer_warranties WHERE customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6');
  SELECT jsonb_build_object(
    'customers',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.customers c WHERE id IN ('24e91623-dec2-4f9b-b879-7b03d9e04b2d','4c04ff55-ecca-4db7-ad10-52253c0ce9ae')),
    'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM public.customer_policies p WHERE customer_id IN ('24e91623-dec2-4f9b-b879-7b03d9e04b2d','4c04ff55-ecca-4db7-ad10-52253c0ce9ae')),
    'warranties',(SELECT jsonb_agg(to_jsonb(w) ORDER BY w.id) FROM public.dealer_warranties w WHERE customer_id IN ('24e91623-dec2-4f9b-b879-7b03d9e04b2d','4c04ff55-ecca-4db7-ad10-52253c0ce9ae'))
  ) INTO v_replacements_before;
  UPDATE public.customer_policies SET status = 'cancelled', updated_at = now()
    WHERE id = 'cd4115d4-5584-4653-82ca-14ef2931aeb1' AND customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6'
      AND policy_number = 'PP-2611-402020' AND status IS DISTINCT FROM 'cancelled';
  UPDATE public.dealer_warranties SET status = 'cancelled'
    WHERE id = '0ccf132e-2264-4639-800f-dd02fad7f78b' AND customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6'
      AND status IS DISTINCT FROM 'cancelled';
  IF NOT EXISTS (SELECT 1 FROM public.customer_policies WHERE id = 'cd4115d4-5584-4653-82ca-14ef2931aeb1' AND status = 'cancelled')
    OR NOT EXISTS (SELECT 1 FROM public.dealer_warranties WHERE id = '0ccf132e-2264-4639-800f-dd02fad7f78b' AND status = 'cancelled') THEN
    RAISE EXCEPTION 'Cancelled warranty copies were not corrected';
  END IF;
  IF v_customer_before IS DISTINCT FROM (SELECT to_jsonb(c) FROM public.customers c WHERE id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6')
    OR v_quote_before IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(q) ORDER BY q.id) FROM public.dealer_quotes q WHERE id IN (SELECT quote_id FROM public.dealer_warranties WHERE customer_id = 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6'))
    OR v_replacements_before IS DISTINCT FROM (SELECT jsonb_build_object(
      'customers',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.customers c WHERE id IN ('24e91623-dec2-4f9b-b879-7b03d9e04b2d','4c04ff55-ecca-4db7-ad10-52253c0ce9ae')),
      'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM public.customer_policies p WHERE customer_id IN ('24e91623-dec2-4f9b-b879-7b03d9e04b2d','4c04ff55-ecca-4db7-ad10-52253c0ce9ae')),
      'warranties',(SELECT jsonb_agg(to_jsonb(w) ORDER BY w.id) FROM public.dealer_warranties w WHERE customer_id IN ('24e91623-dec2-4f9b-b879-7b03d9e04b2d','4c04ff55-ecca-4db7-ad10-52253c0ce9ae')))) THEN
    RAISE EXCEPTION 'Cancellation display repair changed a payment, quote or replacement';
  END IF;
END;
$$;