-- Pulso público sin hashes. Anon puede escuchar esto y recargar el tablero.
create table if not exists public.board_pulse (
  week_id uuid primary key references public.weeks (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_board_pulse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week uuid;
begin
  v_week := coalesce(new.week_id, old.week_id);

  -- La semana se está borrando: no hay tablero que avisar.
  if not exists (select 1 from public.weeks w where w.id = v_week) then
    return null;
  end if;

  insert into public.board_pulse (week_id, updated_at)
  values (v_week, now())
  on conflict (week_id) do update set updated_at = now();

  return null;
end;
$$;

drop trigger if exists bookings_touch_pulse on public.bookings;
create trigger bookings_touch_pulse
  after insert or update or delete on public.bookings
  for each row execute function public.touch_board_pulse();

drop trigger if exists windows_touch_pulse on public.availability_windows;
create trigger windows_touch_pulse
  after insert or update or delete on public.availability_windows
  for each row execute function public.touch_board_pulse();

alter table public.board_pulse enable row level security;
drop policy if exists board_pulse_select on public.board_pulse;
create policy board_pulse_select on public.board_pulse
  for select to anon, authenticated using (true);

grant select on public.board_pulse to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.board_pulse;
exception
  when duplicate_object then null;
end $$;
