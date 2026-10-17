-- Corrige "column reference start_time is ambiguous".
-- RETURNS TABLE expone start_time/end_time/service_id/slot_date/client_name
-- como variables PL/pgSQL; hay que calificar las columnas de las tablas.

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
