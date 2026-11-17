CREATE OR REPLACE FUNCTION public.bdm_dealer_claim_refund_counts(p_dealer_ids uuid[])
RETURNS TABLE(dealer_id uuid, claims integer, refunds integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT d.id,
    (SELECT count(*)::int FROM public.dealer_admin_claims c WHERE c.dealer_id = d.id),
    (SELECT count(*)::int FROM public.customers cu WHERE cu.dealer_id = d.id AND lower(coalesce(cu.payment_status,'')) = 'refunded')
    + (SELECT count(*)::int FROM public.dealer_cancellation_requests r WHERE r.dealer_id = d.id
        AND coalesce(r.refund_amount,0) > 0 AND lower(coalesce(r.status,'')) IN ('approved','processed','refunded','completed'))
  FROM unnest(p_dealer_ids) AS d(id)
  WHERE public.bdm_is_staff(auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.bdm_dealer_claim_refund_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bdm_dealer_claim_refund_counts(uuid[]) TO authenticated;