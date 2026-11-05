CREATE TABLE public.bdm_call_ticks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.bdm_dealerships(id) ON DELETE CASCADE,
  user_id uuid,
  delta smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bdm_call_ticks_created_idx ON public.bdm_call_ticks(created_at);
GRANT SELECT ON public.bdm_call_ticks TO authenticated;
GRANT ALL ON public.bdm_call_ticks TO service_role;
ALTER TABLE public.bdm_call_ticks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ticks visible with dealership" ON public.bdm_call_ticks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bdm_dealerships d WHERE d.id = dealership_id));

CREATE OR REPLACE FUNCTION public.bdm_adjust_calls(p_dealership uuid, p_delta integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare v integer;
begin
  if not bdm_can_access(p_dealership) then raise exception 'Not allowed'; end if;
  if p_delta not in (-1, 1) then raise exception 'Invalid change'; end if;
  update bdm_dealerships set call_count = greatest(call_count + p_delta, 0),
    last_attempt_at = case when p_delta = 1 then now() else last_attempt_at end
  where id = p_dealership returning call_count into v;
  insert into bdm_call_ticks(dealership_id, user_id, delta) values (p_dealership, auth.uid(), p_delta);
  return v;
end $$;

-- Dashboard headline numbers. SECURITY INVOKER so row access rules limit every count.
CREATE OR REPLACE FUNCTION public.bdm_dashboard_stats(_days integer DEFAULT 7, _town text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  WITH p AS (
    SELECT now() - make_interval(days => _days) AS f, now() - make_interval(days => _days * 2) AS pf,
      (date_trunc('day', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London') AS t0
  ), v AS (
    SELECT id, created_at, stage, priority, next_follow_up_at, do_not_contact, last_spoken_at, assigned_bdm
    FROM bdm_dealerships WHERE _town IS NULL OR town = _town
  ), calls AS (
    SELECT a.created_at, 1 AS n FROM bdm_activities a JOIN v ON v.id = a.dealership_id, p WHERE a.activity_type = 'call' AND a.created_at >= p.pf
    UNION ALL
    SELECT c.created_at, c.delta FROM bdm_call_ticks c JOIN v ON v.id = c.dealership_id, p WHERE c.created_at >= p.pf
  )
  SELECT jsonb_build_object(
    'calls', (SELECT coalesce(sum(n),0) FROM calls, p WHERE created_at >= p.f),
    'calls_prev', (SELECT coalesce(sum(n),0) FROM calls, p WHERE created_at < p.f),
    'dealerships', (SELECT count(*) FROM v),
    'new_leads', (SELECT count(*) FROM v, p WHERE created_at >= p.f),
    'new_leads_prev', (SELECT count(*) FROM v, p WHERE created_at >= p.pf AND created_at < p.f),
    'due_today', (SELECT count(*) FROM v, p WHERE NOT do_not_contact AND next_follow_up_at >= p.t0 AND next_follow_up_at < p.t0 + interval '1 day'),
    'overdue', (SELECT count(*) FROM v, p WHERE NOT do_not_contact AND next_follow_up_at < p.t0),
    'hot', (SELECT count(*) FROM v WHERE stage = 'interested' OR priority = 'high'),
    'never', (SELECT count(*) FROM v WHERE last_spoken_at IS NULL AND NOT do_not_contact),
    'unassigned', (SELECT count(*) FROM v WHERE assigned_bdm IS NULL),
    'mine', (SELECT count(*) FROM v WHERE assigned_bdm = auth.uid())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.bdm_dashboard_stats(integer, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bdm_dashboard_stats(integer, text) TO authenticated;