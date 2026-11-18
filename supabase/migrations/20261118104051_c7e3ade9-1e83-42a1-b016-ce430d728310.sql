ALTER TABLE public.trade_warranty_signups ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by uuid;

CREATE OR REPLACE FUNCTION public._tws_admin_guard()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in to the admin dashboard first.'; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = false) THEN
    RAISE EXCEPTION 'Your admin access has been switched off.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')) THEN
    RAISE EXCEPTION 'Only a Super Admin or Admin can delete or restore signups.'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_trade_warranty_signups(p_signup_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_ids uuid[]; v_n integer; v_done uuid[];
BEGIN
  PERFORM public._tws_admin_guard();
  IF p_signup_ids IS NULL OR cardinality(p_signup_ids) = 0 THEN RAISE EXCEPTION 'Select at least one signup to delete.'; END IF;
  SELECT ARRAY(SELECT DISTINCT unnest(p_signup_ids)) INTO v_ids;
  IF cardinality(v_ids) > 200 THEN RAISE EXCEPTION 'Delete up to 200 signups at a time.'; END IF;
  WITH a AS (
    UPDATE public.trade_warranty_signups SET archived_at = now(), archived_by = auth.uid()
    WHERE id = ANY (v_ids) AND archived_at IS NULL AND dealer_id IS NULL AND approved_at IS NULL AND status <> 'approved'
    RETURNING id)
  SELECT count(*)::integer, coalesce(array_agg(id),'{}'::uuid[]) INTO v_n, v_done FROM a;
  RETURN jsonb_build_object('deleted', v_n, 'skipped', cardinality(v_ids) - v_n, 'deleted_ids', v_done);
END; $$;

CREATE OR REPLACE FUNCTION public.restore_trade_warranty_signups(p_signup_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_n integer;
BEGIN
  PERFORM public._tws_admin_guard();
  UPDATE public.trade_warranty_signups SET archived_at = NULL, archived_by = NULL
  WHERE id = ANY (p_signup_ids) AND archived_at IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('restored', v_n);
END; $$;

REVOKE ALL ON FUNCTION public._tws_admin_guard() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_trade_warranty_signups(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._tws_admin_guard() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_trade_warranty_signups(uuid[]) TO authenticated, service_role;