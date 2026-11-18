CREATE OR REPLACE FUNCTION public.delete_trade_warranty_signups(p_signup_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_ids uuid[]; v_n integer; v_done uuid[];
BEGIN
  PERFORM public._tws_admin_guard();
  IF p_signup_ids IS NULL OR cardinality(p_signup_ids) = 0 THEN RAISE EXCEPTION 'Select at least one signup to archive.'; END IF;
  SELECT ARRAY(SELECT DISTINCT unnest(p_signup_ids)) INTO v_ids;
  IF cardinality(v_ids) > 200 THEN RAISE EXCEPTION 'Archive up to 200 signups at a time.'; END IF;
  -- Archiving only hides the signup row; dealer accounts, warranties and sales are untouched and it can be restored.
  WITH a AS (
    UPDATE public.trade_warranty_signups SET archived_at = now(), archived_by = auth.uid()
    WHERE id = ANY (v_ids) AND archived_at IS NULL
    RETURNING id)
  SELECT count(*)::integer, coalesce(array_agg(id),'{}'::uuid[]) INTO v_n, v_done FROM a;
  RETURN jsonb_build_object('deleted', v_n, 'skipped', cardinality(v_ids) - v_n, 'deleted_ids', v_done);
END; $$;