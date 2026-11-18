ALTER TABLE public.dealer_cancellation_requests
  ADD COLUMN IF NOT EXISTS progress text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS notes_log jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.update_dealer_cancellation_progress(p_request_id uuid, p_progress text, p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NOT (is_admin(auth.uid()) OR can_process_dealer_cancellations(auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF p_progress IS NOT NULL AND p_progress NOT IN ('new','in_progress','waiting_dealer','waiting_customer') THEN
    RAISE EXCEPTION 'Invalid progress';
  END IF;
  SELECT coalesce(nullif(trim(coalesce(first_name,'')||' '||coalesce(last_name,'')),''), email) INTO v_name
    FROM admin_users WHERE user_id = auth.uid() LIMIT 1;
  IF v_name IS NULL THEN SELECT email INTO v_name FROM auth.users WHERE id = auth.uid(); END IF;
  UPDATE dealer_cancellation_requests SET
    progress = coalesce(p_progress, progress),
    notes_log = CASE WHEN nullif(trim(coalesce(p_note,'')),'') IS NULL AND (p_progress IS NULL OR p_progress = progress) THEN notes_log
      ELSE notes_log || jsonb_build_array(jsonb_build_object('at', now(), 'by', coalesce(v_name,'Staff'),
        'note', nullif(trim(coalesce(p_note,'')),''), 'progress', CASE WHEN p_progress IS DISTINCT FROM progress THEN p_progress END)) END
  WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.update_dealer_cancellation_progress(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_dealer_cancellation_progress(uuid,text,text) TO authenticated;