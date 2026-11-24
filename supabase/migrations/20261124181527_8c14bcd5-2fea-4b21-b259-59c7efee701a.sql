DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname = 'ensure_dealer_customer_portal_policy';
  IF position('OR NOT (COALESCE(c.payment_verified, false) OR c.payment_status IN (''invoice_pending'', ''overdue''))' IN definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected customer portal guard definition';
  END IF;
  definition := replace(definition,
    'OR NOT (COALESCE(c.payment_verified, false) OR c.payment_status IN (''invoice_pending'', ''overdue''))',
    'OR c.payment_status IS NULL OR c.payment_status NOT IN (''paid'', ''invoice_pending'', ''overdue'') OR NOT (COALESCE(c.payment_verified, false) OR COALESCE(c.payment_status IN (''invoice_pending'', ''overdue''), false))');
  EXECUTE definition;
END;
$$;