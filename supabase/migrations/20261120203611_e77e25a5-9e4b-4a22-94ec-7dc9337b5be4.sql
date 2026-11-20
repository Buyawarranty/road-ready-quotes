CREATE OR REPLACE FUNCTION public.dealer_bogof_remaining(p_dealer_id uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN NOT coalesce((SELECT enabled FROM public.dealer_bogof_settings WHERE id = 1), false) THEN 0
  ELSE greatest(0,
    least(3, (SELECT count(*) FROM public.customers WHERE dealer_id = p_dealer_id AND payment_status = 'paid'
       AND coalesce(final_amount,0) > 0 AND lower(coalesce(status,'')) NOT IN ('cancelled','refunded'))::int)
    - (SELECT count(*) FROM public.dealer_intro_free_redemptions WHERE dealer_id = p_dealer_id AND status <> 'rejected')::int)
  END
$function$;