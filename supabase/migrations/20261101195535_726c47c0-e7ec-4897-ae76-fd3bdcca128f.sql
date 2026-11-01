UPDATE public.dealer_admin_plans
SET pricing_matrix = jsonb_set(pricing_matrix::jsonb, '{terms}', (
  SELECT jsonb_agg(t || jsonb_build_object('retail_price', CASE (t->>'months')::int WHEN 12 THEN 400 WHEN 24 THEN 700 WHEN 36 THEN 1000 WHEN 48 THEN 1400 ELSE (t->>'retail_price')::numeric END))
  FROM jsonb_array_elements(pricing_matrix::jsonb->'terms') t))
WHERE id = 'cd4c410e-fbcf-4fd7-a55d-2739e885eef5';