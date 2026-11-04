alter table public.bdm_dealerships add column if not exists activity_count integer not null default 0, add column if not exists order_count integer not null default 0;

update public.bdm_dealerships d set activity_count = (select count(*) from public.bdm_activities a where a.dealership_id = d.id);
update public.bdm_dealerships d set order_count = (select count(*) from public.dealer_warranties w where w.dealer_id = d.dealer_id and coalesce(w.is_test,false) = false) where d.dealer_id is not null;

create or replace function public.bdm_bump_activity_count() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update bdm_dealerships set activity_count = activity_count + 1 where id = new.dealership_id;
  elsif tg_op = 'DELETE' then update bdm_dealerships set activity_count = greatest(activity_count - 1, 0) where id = old.dealership_id; end if;
  return null;
end $$;
drop trigger if exists trg_bdm_activity_count on public.bdm_activities;
create trigger trg_bdm_activity_count after insert or delete on public.bdm_activities for each row execute function public.bdm_bump_activity_count();

create or replace function public.bdm_refresh_order_count() returns trigger language plpgsql security definer set search_path = public as $$
declare v uuid := coalesce(new.dealer_id, old.dealer_id);
begin
  update bdm_dealerships set order_count = (select count(*) from dealer_warranties w where w.dealer_id = v and coalesce(w.is_test,false) = false) where dealer_id = v;
  return null;
end $$;
drop trigger if exists trg_bdm_order_count on public.dealer_warranties;
create trigger trg_bdm_order_count after insert or delete or update of dealer_id, is_test on public.dealer_warranties for each row execute function public.bdm_refresh_order_count();