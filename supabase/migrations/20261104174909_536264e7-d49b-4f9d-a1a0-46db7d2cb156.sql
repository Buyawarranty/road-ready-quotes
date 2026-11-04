alter table public.bdm_dealerships add column if not exists call_count integer not null default 0;
update public.bdm_dealerships d set call_count = (select count(*) from public.bdm_activities a where a.dealership_id = d.id and a.activity_type = 'call');

create or replace function public.bdm_adjust_calls(p_dealership uuid, p_delta integer) returns integer
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if not bdm_can_access(p_dealership) then raise exception 'Not allowed'; end if;
  if p_delta not in (-1, 1) then raise exception 'Invalid change'; end if;
  update bdm_dealerships set call_count = greatest(call_count + p_delta, 0),
    last_attempt_at = case when p_delta = 1 then now() else last_attempt_at end
  where id = p_dealership returning call_count into v;
  return v;
end $$;
revoke execute on function public.bdm_adjust_calls(uuid, integer) from public, anon;
grant execute on function public.bdm_adjust_calls(uuid, integer) to authenticated;

create or replace function public.bdm_set_stage(p_dealership uuid, p_stage text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not bdm_can_access(p_dealership) then raise exception 'Not allowed'; end if;
  update bdm_dealerships set stage = p_stage, updated_at = now() where id = p_dealership;
end $$;
revoke execute on function public.bdm_set_stage(uuid, text) from public, anon;
grant execute on function public.bdm_set_stage(uuid, text) to authenticated;