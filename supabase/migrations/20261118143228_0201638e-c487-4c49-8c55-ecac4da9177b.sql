CREATE TABLE public.dealer_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  signed_in_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);
CREATE INDEX dealer_login_events_user_idx ON public.dealer_login_events(user_id, signed_in_at DESC);
GRANT INSERT ON public.dealer_login_events TO authenticated;
GRANT ALL ON public.dealer_login_events TO service_role;
ALTER TABLE public.dealer_login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dealers record own sign-in" ON public.dealer_login_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.dealer_login_history(p_user uuid, p_limit int DEFAULT 100)
RETURNS TABLE(signed_in_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT DISTINCT ON (date_trunc('minute', t)) t FROM (
    SELECT e.signed_in_at AS t FROM public.dealer_login_events e WHERE e.user_id = p_user
    UNION ALL
    SELECT a.created_at FROM auth.audit_log_entries a
     WHERE a.payload->>'action' = 'login' AND a.payload->>'actor_id' = p_user::text
    UNION ALL
    SELECT u.last_sign_in_at FROM auth.users u WHERE u.id = p_user AND u.last_sign_in_at IS NOT NULL
  ) s
  ORDER BY date_trunc('minute', t) DESC, t DESC
  LIMIT p_limit
$$;
REVOKE EXECUTE ON FUNCTION public.dealer_login_history(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dealer_login_history(uuid, int) TO service_role;