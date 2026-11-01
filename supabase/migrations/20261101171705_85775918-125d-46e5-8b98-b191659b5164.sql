REVOKE EXECUTE ON FUNCTION public.guard_dealer_locked_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.review_dealer_profile_change(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_dealer_profile_change(uuid, boolean, text) TO authenticated;