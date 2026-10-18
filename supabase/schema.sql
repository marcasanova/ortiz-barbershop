-- OrtizBarbershop — ventanas + dos cortes (30 / 40 min)
-- Zona: Europe/Madrid (date + time).

create extension if not exists pgcrypto with schema extensions;

drop view if exists public.week_board cascade;
drop function if exists public.book_slot(text, uuid, text, text, text);
drop function if exists public.book_slot(text, text, date, time, text, text, text);
drop function if exists public.cancel_booking_by_token(text, uuid, text);
drop function if exists public.admin_cancel_booking(uuid);
drop function if exists public.rotate_public_link(uuid);
drop function if exists public.replace_day_slots(uuid, date, jsonb);
drop function if exists public.replace_day_windows(uuid, date, jsonb);
drop function if exists public.set_updated_at() cascade;
drop table if exists public.bookings cascade;
drop table if exists public.slots cascade;
drop table if exists public.availability_windows cascade;
drop table if exists public.services cascade;
drop table if exists public.settings cascade;
drop table if exists public.weeks cascade;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  public_token text unique,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index weeks_one_active
  on public.weeks (is_active)
  where is_active;

create table public.services (
  id text primary key,
  label text not null,
  duration_minutes integer not null,
  constraint services_positive_duration check (duration_minutes > 0)
);

insert into public.services (id, label, duration_minutes) values
  ('corte', 'Corte', 30),
  ('corte_barba', 'Corte + barba', 40);

create table public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  constraint windows_range check (end_time > start_time)
);

create index windows_week_date
  on public.availability_windows (week_id, date, start_time);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks (id) on delete cascade,
  window_id uuid not null references public.availability_windows (id) on delete cascade,
  service_id text not null references public.services (id),
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  client_name text not null,
  client_name_normalized text generated always as (lower(trim(client_name))) stored,
  client_key_hash text not null,
  cancel_token_hash text not null,
  created_at timestamptz not null default now(),
  constraint bookings_range check (end_time > start_time),
  constraint bookings_name_length check (char_length(trim(client_name)) between 1 and 40),
  constraint bookings_name_per_day unique (slot_date, client_name_normalized),
  constraint bookings_client_per_day unique (slot_date, client_key_hash)
);

create index bookings_day
  on public.bookings (week_id, slot_date, start_time);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger weeks_set_updated_at
  before update on public.weeks
  for each row
  execute function public.set_updated_at();

create view public.week_board as
select
  w.public_token,
  win.id as window_id,
  win.week_id,
  win.date,
  win.start_time as window_start,
  win.end_time as window_end,
  b.id as booking_id,
  b.service_id,
  b.start_time as booking_start,
  b.end_time as booking_end,
  b.client_name
from public.weeks w
join public.availability_windows win on win.week_id = w.id
left join public.bookings b on b.window_id = win.id
where w.is_active = true
  and w.public_token is not null;

-- ---------------------------------------------------------------------------
-- Funciones
-- ---------------------------------------------------------------------------

create or replace function public.book_slot(
  p_token text,
  p_service_id text,
  p_date date,
  p_start_time time,
  p_client_name text,
  p_client_key_hash text,
  p_cancel_token_hash text
)
returns table (
  booking_id uuid,
  service_id text,
  slot_date date,
  start_time time,
  end_time time,
  client_name text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_week public.weeks%rowtype;
  v_service public.services%rowtype;
  v_window public.availability_windows%rowtype;
  v_name text;
  v_end time;
  v_overlap boolean;
begin
  select * into v_week
  from public.weeks w
  where w.public_token = p_token
    and w.is_active = true
  for update;

  if not found then
    raise exception 'LINK_EXPIRED';
  end if;

  select * into v_service
  from public.services s
  where s.id = p_service_id;

  if not found then
    raise exception 'INVALID_SERVICE';
  end if;

  v_end := p_start_time + make_interval(mins => v_service.duration_minutes);

  select * into v_window
  from public.availability_windows w
  where w.week_id = v_week.id
    and w.date = p_date
    and w.start_time <= p_start_time
    and w.end_time >= v_end
  for update
  limit 1;

  if not found then
    raise exception 'SLOT_TAKEN';
  end if;

  perform 1
  from public.bookings b
  where b.week_id = v_week.id
    and b.slot_date = p_date
  for update;

  select exists (
    select 1
    from public.bookings b
    where b.week_id = v_week.id
      and b.slot_date = p_date
      and b.start_time < v_end
      and b.end_time > p_start_time
  ) into v_overlap;

  if v_overlap then
    raise exception 'SLOT_TAKEN';
  end if;

  v_name := trim(p_client_name);
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'INVALID_NAME';
  end if;

  begin
    return query
    insert into public.bookings (
      week_id,
      window_id,
      service_id,
      slot_date,
      start_time,
      end_time,
      client_name,
      client_key_hash,
      cancel_token_hash
    )
    values (
      v_week.id,
      v_window.id,
      v_service.id,
      p_date,
      p_start_time,
      v_end,
      v_name,
      p_client_key_hash,
      p_cancel_token_hash
    )
    returning
      bookings.id,
      bookings.service_id,
      bookings.slot_date,
      bookings.start_time,
      bookings.end_time,
      bookings.client_name;
  exception
    when unique_violation then
      if sqlerrm like '%bookings_name_per_day%' then
        raise exception 'NAME_TAKEN_THAT_DAY';
      elsif sqlerrm like '%bookings_client_per_day%' then
        raise exception 'ALREADY_BOOKED_THAT_DAY';
      else
        raise;
      end if;
  end;
end;
$$;

create or replace function public.cancel_booking_by_token(
  p_token text,
  p_booking_id uuid,
  p_cancel_token_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_week public.weeks%rowtype;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_week
  from public.weeks
  where id = v_booking.week_id
  for update;

  if v_week.is_active is not true or v_week.public_token is distinct from p_token then
    raise exception 'LINK_EXPIRED';
  end if;

  if v_booking.cancel_token_hash is distinct from p_cancel_token_hash then
    raise exception 'FORBIDDEN';
  end if;

  delete from public.bookings where id = p_booking_id;
end;
$$;

create or replace function public.admin_cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

create or replace function public.rotate_public_link(p_week_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if not exists (select 1 from public.weeks where id = p_week_id) then
    raise exception 'NOT_FOUND';
  end if;

  update public.weeks
  set is_active = false,
      public_token = null
  where is_active;

  v_token := encode(gen_random_bytes(4), 'hex');

  update public.weeks
  set is_active = true,
      public_token = v_token
  where id = p_week_id;

  return v_token;
end;
$$;

create or replace function public.replace_day_windows(
  p_week_id uuid,
  p_date date,
  p_windows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.weeks where id = p_week_id) then
    raise exception 'NOT_FOUND';
  end if;

  delete from public.availability_windows
  where week_id = p_week_id
    and date = p_date;

  insert into public.availability_windows (week_id, date, start_time, end_time)
  select
    p_week_id,
    p_date,
    x.start_time,
    x.end_time
  from jsonb_to_recordset(p_windows) as x(start_time time, end_time time);
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

alter table public.weeks enable row level security;
alter table public.services enable row level security;
alter table public.availability_windows enable row level security;
alter table public.bookings enable row level security;

revoke all on public.weeks from anon, authenticated;
revoke all on public.services from anon, authenticated;
revoke all on public.availability_windows from anon, authenticated;
revoke all on public.bookings from anon, authenticated;

grant select on public.week_board to anon, authenticated;
grant select on public.services to anon, authenticated;

revoke all on function public.book_slot(text, text, date, time, text, text, text) from public;
revoke all on function public.cancel_booking_by_token(text, uuid, text) from public;
revoke all on function public.admin_cancel_booking(uuid) from public;
revoke all on function public.rotate_public_link(uuid) from public;
revoke all on function public.replace_day_windows(uuid, date, jsonb) from public;

grant execute on function public.book_slot(text, text, date, time, text, text, text) to service_role;
grant execute on function public.cancel_booking_by_token(text, uuid, text) to service_role;
grant execute on function public.admin_cancel_booking(uuid) to service_role;
grant execute on function public.rotate_public_link(uuid) to service_role;
grant execute on function public.replace_day_windows(uuid, date, jsonb) to service_role;
