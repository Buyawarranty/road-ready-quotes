-- Rollback-only regression: no fixture rows, payments, emails or saved status changes.
BEGIN;
DO $$
DECLARE
  v_cancelled uuid := 'eb38aa3a-6ae9-4132-b09d-be2fcde00dc6';
  v_replacement uuid := '24e91623-dec2-4f9b-b879-7b03d9e04b2d';
  v_cancelled_before jsonb;
BEGIN
  SELECT to_jsonb(c) INTO v_cancelled_before FROM public.customers c WHERE id = v_cancelled;
  IF v_cancelled_before->>'warranty_number' IS DISTINCT FROM 'PP-2611-402020'
    OR lower(v_cancelled_before->>'status') IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'The reported FP14UBL cover must remain cancelled';
  END IF;
  UPDATE public.customer_policies SET status = 'active' WHERE customer_id = v_cancelled;
  UPDATE public.dealer_warranties SET status = 'active' WHERE customer_id = v_cancelled;
  IF EXISTS (SELECT 1 FROM public.customer_policies WHERE customer_id = v_cancelled AND status <> 'cancelled')
    OR EXISTS (SELECT 1 FROM public.dealer_warranties WHERE customer_id = v_cancelled AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'Stale activation must not reactivate cancelled cover';
  END IF;
  IF public.ensure_dealer_customer_portal_policy(v_cancelled) IS NOT NULL THEN
    RAISE EXCEPTION 'Recovery must not issue new cover for a cancelled sale';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customer_policies WHERE customer_id = v_replacement AND status = 'active') THEN
    RAISE EXCEPTION 'Separate FP14UBL replacement must stay active';
  END IF;
  UPDATE public.customers SET status = 'Cancelled' WHERE id = v_replacement;
  IF NOT EXISTS (SELECT 1 FROM public.customer_policies WHERE customer_id = v_replacement AND status = 'cancelled')
    OR NOT EXISTS (SELECT 1 FROM public.dealer_warranties WHERE customer_id = v_replacement AND status = 'cancelled') THEN
    RAISE EXCEPTION 'Future cancellations must synchronize every linked copy';
  END IF;
  UPDATE public.customers SET status = 'Refunded' WHERE id = v_replacement;
  IF NOT EXISTS (SELECT 1 FROM public.customer_policies WHERE customer_id = v_replacement AND status = 'cancelled')
    OR NOT EXISTS (SELECT 1 FROM public.dealer_warranties WHERE customer_id = v_replacement AND status = 'refunded') THEN
    RAISE EXCEPTION 'Refunded cover must stay inactive in both copies';
  END IF;
  IF v_cancelled_before IS DISTINCT FROM (SELECT to_jsonb(c) FROM public.customers c WHERE id = v_cancelled) THEN
    RAISE EXCEPTION 'Cancellation copy repairs must preserve the settled sale and payment';
  END IF;
  IF has_function_privilege('anon', 'public.sync_panda_terminal_cover_status()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.sync_panda_terminal_cover_status()', 'EXECUTE')
    OR has_function_privilege('anon', 'public.guard_panda_terminal_cover_status()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.guard_panda_terminal_cover_status()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Status synchronization must remain service-only';
  END IF;
END;
$$;
ROLLBACK;