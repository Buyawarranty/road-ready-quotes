-- No example rows: run against the already settled screenshot sale and preserve every existing record.
DO $$
DECLARE v_quote jsonb; v_customer jsonb; v_warranty jsonb; v_result jsonb;
BEGIN
  SELECT to_jsonb(q) INTO v_quote FROM public.dealer_quotes q WHERE id='26548b26-ecc9-4d99-b899-dc888d05d35e';
  SELECT to_jsonb(w) INTO v_warranty FROM public.dealer_warranties w WHERE quote_id='26548b26-ecc9-4d99-b899-dc888d05d35e';
  SELECT to_jsonb(c) INTO v_customer FROM public.customers c WHERE id=(v_warranty->>'customer_id')::uuid;
  IF v_quote IS NULL OR v_quote->>'paid_at' IS NULL OR v_warranty IS NULL OR v_customer->>'payment_status' <> 'paid' THEN
    RAISE EXCEPTION 'The reported processed quote must have its existing paid sale and warranty';
  END IF;
  v_result := public.complete_dealer_sale((v_warranty->>'customer_id')::uuid,
    '26548b26-ecc9-4d99-b899-dc888d05d35e', v_quote->>'stripe_session_id', 'paid');
  IF v_result->>'dealer_warranty_id' IS DISTINCT FROM v_warranty->>'id' THEN
    RAISE EXCEPTION 'Repeat confirmation must reuse the existing warranty';
  END IF;
  IF v_quote IS DISTINCT FROM (SELECT to_jsonb(q) FROM public.dealer_quotes q WHERE id='26548b26-ecc9-4d99-b899-dc888d05d35e')
    OR v_warranty IS DISTINCT FROM (SELECT to_jsonb(w) FROM public.dealer_warranties w WHERE quote_id='26548b26-ecc9-4d99-b899-dc888d05d35e')
    OR v_customer IS DISTINCT FROM (SELECT to_jsonb(c) FROM public.customers c WHERE id=(v_warranty->>'customer_id')::uuid) THEN
    RAISE EXCEPTION 'Repeat confirmation must leave all settled sale records unchanged';
  END IF;
END;
$$;