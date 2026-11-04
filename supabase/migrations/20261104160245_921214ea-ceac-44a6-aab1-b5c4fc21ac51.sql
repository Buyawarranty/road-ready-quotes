REVOKE EXECUTE ON FUNCTION public.bdm_has_role(uuid, text[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bdm_access_ok(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bdm_has_role(uuid, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.bdm_access_ok(uuid) TO service_role;