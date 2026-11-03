CREATE OR REPLACE FUNCTION public.update_annual_dealer_prices(_terms jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t jsonb; m int; d numeric; r numeric; matrix jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active AND role::text IN ('admin','super_admin')) THEN
    RAISE EXCEPTION 'Only admins can change warranty prices';
  END IF;
  SELECT pricing_matrix INTO matrix FROM dealer_admin_plans
   WHERE is_active AND pricing_matrix @> '{"brand":"pandaprotect","version":"annual-v1"}' LIMIT 1 FOR UPDATE;
  IF matrix IS NULL THEN RAISE EXCEPTION 'Annual price list not found'; END IF;
  FOR t IN SELECT * FROM jsonb_array_elements(_terms) LOOP
    m := (t->>'months')::int; d := (t->>'dealer_price')::numeric; r := (t->>'retail_price')::numeric;
    IF m NOT IN (12,24,36,48) OR d IS NULL OR r IS NULL OR d <= 0 OR r < d OR d <> trunc(d) OR r <> trunc(r) THEN
      RAISE EXCEPTION 'Invalid prices for % months', m;
    END IF;
    matrix := jsonb_set(matrix, '{terms}', (SELECT jsonb_agg(CASE WHEN (x->>'months')::int = m
      THEN x || jsonb_build_object('dealer_price', d, 'retail_price', r, 'min_price', d) ELSE x END)
      FROM jsonb_array_elements(matrix->'terms') x));
  END LOOP;
  UPDATE dealer_admin_plans SET pricing_matrix = matrix, updated_at = now()
   WHERE is_active AND pricing_matrix @> '{"brand":"pandaprotect","version":"annual-v1"}';
END $$;
REVOKE ALL ON FUNCTION public.update_annual_dealer_prices(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_annual_dealer_prices(jsonb) TO authenticated;