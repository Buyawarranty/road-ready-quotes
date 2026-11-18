CREATE OR REPLACE FUNCTION public.delete_trade_warranty_signups(p_signup_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ids uuid[];
  v_deleted integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in to the admin dashboard first.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND is_active = false
  ) THEN
    RAISE EXCEPTION 'Your admin access has been switched off.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only a Super Admin or Admin can delete signups.';
  END IF;

  IF p_signup_ids IS NULL OR cardinality(p_signup_ids) = 0 THEN
    RAISE EXCEPTION 'Select at least one signup to delete.';
  END IF;

  SELECT ARRAY(SELECT DISTINCT unnest(p_signup_ids)) INTO v_ids;

  IF cardinality(v_ids) > 200 THEN
    RAISE EXCEPTION 'Delete up to 200 signups at a time.';
  END IF;

  -- Lock the selected applications so an approval cannot race with deletion.
  PERFORM 1 FROM public.trade_warranty_signups
  WHERE id = ANY (v_ids)
  FOR UPDATE;

  DELETE FROM public.trade_warranty_signup_notes
  WHERE signup_id IN (
    SELECT id FROM public.trade_warranty_signups
    WHERE id = ANY (v_ids)
      AND dealer_id IS NULL
      AND approved_at IS NULL
      AND status <> 'approved'
  );

  DELETE FROM public.trade_warranty_signups
  WHERE id = ANY (v_ids)
    AND dealer_id IS NULL
    AND approved_at IS NULL
    AND status <> 'approved';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted', v_deleted,
    'skipped', cardinality(v_ids) - v_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_trade_warranty_signups(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_trade_warranty_signups(uuid[]) TO authenticated, service_role;