UPDATE public.dealer_admin_plans
SET pricing_matrix = jsonb_set(
  pricing_matrix,
  '{terms}',
  (
    SELECT jsonb_agg(
      CASE (term->>'months')::integer
        WHEN 12 THEN term || '{"retail_price":599}'::jsonb
        WHEN 24 THEN term || '{"retail_price":899}'::jsonb
        WHEN 36 THEN term || '{"retail_price":1199}'::jsonb
        WHEN 48 THEN term || '{"retail_price":1599}'::jsonb
        ELSE term
      END
      ORDER BY (term->>'months')::integer
    )
    FROM jsonb_array_elements(pricing_matrix->'terms') AS term
  ),
  false
),
updated_at = now()
WHERE is_active = true
  AND pricing_matrix @> '{"brand":"pandaprotect","version":"annual-v1"}'::jsonb;