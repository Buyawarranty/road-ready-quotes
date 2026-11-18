CREATE OR REPLACE FUNCTION public.can_process_dealer_cancellations(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text IN ('admin', 'super_admin', 'accounts', 'accounts_manager')
      AND (
        NOT EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = ur.user_id)
        OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = ur.user_id AND au.is_active = true)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_process_dealer_cancellations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_process_dealer_cancellations(uuid) TO authenticated, service_role;

DROP POLICY "Dealers view own cancellation requests" ON public.dealer_cancellation_requests;
DROP POLICY "Cancellation reviewers view dealer requests" ON public.dealer_cancellation_requests;
CREATE POLICY "Dealers and reviewers view cancellation requests"
ON public.dealer_cancellation_requests
FOR SELECT
TO authenticated
USING (
  dealer_id = public.current_dealer_id()
  OR public.is_admin(auth.uid())
  OR public.can_process_dealer_cancellations(auth.uid())
);