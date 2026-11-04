REVOKE EXECUTE ON FUNCTION public.bdm_is_town_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bdm_has_town(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bdm_is_town_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bdm_has_town(uuid, text) TO authenticated;