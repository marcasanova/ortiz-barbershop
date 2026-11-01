-- Panel de Raúl: gestionar clientes, marcar pagos y editar horarios sin perder
-- reservas. Requiere swap-requests.sql y fix-board-pulse.sql ya aplicados.
-- Solo añade columnas y funciones, y sustituye dos funciones. No borra datos.

alter table public.bookings add column if not exists paid_at timestamptz;
alter table public.bookings
  add column if not exists created_by_admin boolean not null default false;
-- null = Raúl la ha puesto fuera del horario del día.
alter table public.bookings alter column window_id drop not null;

-- Fin de un servicio que empieza en p_start.
create or replace function public.admin_service_end(p_service_id text, p_start time)
returns time
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_duration integer;
  v_end time;
begin
  select s.duration_minutes into v_duration
  from public.services s
  where s.id = p_service_id;

  if not found then
    raise exception 'INVALID_SERVICE';
  end if;

  v_end := p_start + make_interval(mins => v_duration);
  if v_end <= p_start then
    raise exception 'SLOT_TAKEN';
  end if;

  return v_end;
end;
$$;

-- Raúl puede usar cualquier hora de un día abierto, sin pisar a nadie.
-- Devuelve la franja que la contiene, o null si queda fuera del horario.
create or replace function public.admin_slot_window(
  p_week_id uuid,
  p_date date,
  p_start time,
  p_end time,
  p_exclude uuid[]
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_window uuid;
begin
  if not exists (
    select 1 from public.availability_windows w
    where w.week_id = p_week_id and w.date = p_date
  ) then
    raise exception 'DAY_NOT_OPEN';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.week_id = p_week_id
      and b.slot_date = p_date
      and not (b.id = any (p_exclude))
      and b.start_time < p_end
      and b.end_time > p_start
  ) then
    raise exception 'SLOT_TAKEN';
  end if;

  select w.id into v_window
  from public.availability_windows w
  where w.week_id = p_week_id
    and w.date = p_date
    and w.start_time <= p_start
    and w.end_time >= p_end
  limit 1;

  return v_window;
end;
$$;

-- Si Raúl mueve una reserva, las peticiones pendientes sobre ella ya no valen.
create or replace function public.admin_expire_requests(p_booking_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.swap_requests r
  set status = 'expired', resolved_at = now()
  where r.status = 'pending'
    and (r.target_booking_id = any (p_booking_ids)
         or r.requester_booking_id = any (p_booking_ids));
$$;

create or replace function public.admin_create_booking(
  p_week_id uuid,
  p_name text,
  p_service_id text,
  p_date date,
  p_start_time time
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_end time;
  v_window uuid;
  v_id uuid;
begin
  perform 1 from public.weeks w where w.id = p_week_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'INVALID_NAME';
  end if;

  v_end := public.admin_service_end(p_service_id, p_start_time);

  perform 1 from public.bookings b
  where b.week_id = p_week_id and b.slot_date = p_date
  for update;

  v_window := public.admin_slot_window(p_week_id, p_date, p_start_time, v_end, '{}');

  begin
    -- Hashes aleatorios: esta reserva no pertenece a ningún navegador.
    insert into public.bookings (
      week_id, window_id, service_id, slot_date, start_time, end_time,
      client_name, client_key_hash, cancel_token_hash, created_by_admin
    )
    values (
      p_week_id, v_window, p_service_id, p_date, p_start_time, v_end, v_name,
      'admin-' || gen_random_uuid(), 'admin-' || gen_random_uuid(), true
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'NAME_TAKEN_THAT_DAY';
  end;

  return v_id;
end;
$$;

create or replace function public.admin_update_booking(
  p_booking_id uuid,
  p_name text,
  p_service_id text,
  p_date date,
  p_start_time time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_name text := trim(coalesce(p_name, ''));
  v_end time;
  v_window uuid;
begin
  select * into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  perform 1 from public.weeks w where w.id = v_booking.week_id for update;

  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'INVALID_NAME';
  end if;

  v_end := public.admin_service_end(p_service_id, p_start_time);

  perform 1 from public.bookings b
  where b.week_id = v_booking.week_id and b.slot_date = p_date
  for update;

  v_window := public.admin_slot_window(
    v_booking.week_id, p_date, p_start_time, v_end, array[v_booking.id]
  );

  begin
    update public.bookings b
    set client_name = v_name,
        service_id = p_service_id,
        slot_date = p_date,
        start_time = p_start_time,
        end_time = v_end,
        window_id = v_window
    where b.id = v_booking.id;
  exception
    when unique_violation then
      if sqlerrm like '%bookings_client_per_day%' then
        raise exception 'ALREADY_BOOKED_THAT_DAY';
      else
        raise exception 'NAME_TAKEN_THAT_DAY';
      end if;
  end;

  perform public.admin_expire_requests(array[v_booking.id]);
end;
$$;

-- Cada cliente pasa a la fecha y hora del otro y conserva su servicio.
create or replace function public.admin_swap_bookings(p_booking_a uuid, p_booking_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a public.bookings%rowtype;
  v_b public.bookings%rowtype;
  v_a_end time;
  v_b_end time;
  v_a_window uuid;
  v_b_window uuid;
begin
  if p_booking_a = p_booking_b then
    raise exception 'NOT_FOUND';
  end if;

  -- Siempre en el mismo orden para no bloquearse entre dos intercambios.
  perform 1 from public.bookings b
  where b.id in (p_booking_a, p_booking_b)
  order by b.id
  for update;

  select * into v_a from public.bookings b where b.id = p_booking_a;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_b from public.bookings b where b.id = p_booking_b;
  if not found or v_b.week_id <> v_a.week_id then
    raise exception 'NOT_FOUND';
  end if;

  perform 1 from public.weeks w where w.id = v_a.week_id for update;

  v_a_end := public.admin_service_end(v_a.service_id, v_b.start_time);
  v_b_end := public.admin_service_end(v_b.service_id, v_a.start_time);

  v_a_window := public.admin_slot_window(
    v_a.week_id, v_b.slot_date, v_b.start_time, v_a_end, array[v_a.id, v_b.id]
  );
  v_b_window := public.admin_slot_window(
    v_a.week_id, v_a.slot_date, v_a.start_time, v_b_end, array[v_a.id, v_b.id]
  );

  -- En el mismo día, las dos posiciones nuevas no pueden pisarse entre sí.
  if v_a.slot_date = v_b.slot_date
    and greatest(v_a.start_time, v_b.start_time) < least(v_a_end, v_b_end) then
    raise exception 'SLOT_TAKEN';
  end if;

  begin
    update public.bookings b
    set slot_date = v_b.slot_date, start_time = v_b.start_time,
        end_time = v_a_end, window_id = v_a_window
    where b.id = v_a.id;

    update public.bookings b
    set slot_date = v_a.slot_date, start_time = v_a.start_time,
        end_time = v_b_end, window_id = v_b_window
    where b.id = v_b.id;
  exception
    when unique_violation then
      if sqlerrm like '%bookings_client_per_day%' then
        raise exception 'ALREADY_BOOKED_THAT_DAY';
      else
        raise exception 'NAME_TAKEN_THAT_DAY';
      end if;
  end;

  perform public.admin_expire_requests(array[v_a.id, v_b.id]);
end;
$$;

create or replace function public.admin_set_paid(p_booking_id uuid, p_paid boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings b
  set paid_at = case when p_paid then coalesce(b.paid_at, now()) end
  where b.id = p_booking_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

-- Mueve un día entero (franjas y reservas) a otra fecha libre.
create or replace function public.admin_move_day(p_week_id uuid, p_from date, p_to date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  perform 1 from public.weeks w where w.id = p_week_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.availability_windows w
    where w.week_id = p_week_id and w.date = p_from
  ) then
    raise exception 'NOT_FOUND';
  end if;

  if exists (
    select 1 from public.availability_windows w
    where w.week_id = p_week_id and w.date = p_to
  ) then
    raise exception 'DAY_TAKEN';
  end if;

  select coalesce(array_agg(b.id), '{}') into v_ids
  from public.bookings b
  where b.week_id = p_week_id and b.slot_date = p_from;

  update public.availability_windows w
  set date = p_to
  where w.week_id = p_week_id and w.date = p_from;

  begin
    update public.bookings b
    set slot_date = p_to
    where b.week_id = p_week_id and b.slot_date = p_from;
  exception
    when unique_violation then
      raise exception 'NAME_TAKEN_THAT_DAY';
  end;

  perform public.admin_expire_requests(v_ids);
end;
$$;

-- Sustituye la anterior, que borraba TODAS las reservas del día al guardar el
-- horario (bookings.window_id va en cascada). Ahora solo caen las que tenían
-- franja y se quedan fuera de las nuevas; las que Raúl puso fuera del horario
-- se mantienen mientras el día siga abierto.
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
declare
  v_old uuid[];
begin
  perform 1 from public.weeks w where w.id = p_week_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  perform 1 from public.bookings b
  where b.week_id = p_week_id and b.slot_date = p_date
  for update;

  select coalesce(array_agg(w.id), '{}') into v_old
  from public.availability_windows w
  where w.week_id = p_week_id and w.date = p_date;

  -- Quitar el día: se va con todas sus reservas.
  if jsonb_array_length(p_windows) = 0 then
    delete from public.bookings b
    where b.week_id = p_week_id and b.slot_date = p_date;

    delete from public.availability_windows w where w.id = any (v_old);
    return;
  end if;

  insert into public.availability_windows (week_id, date, start_time, end_time)
  select p_week_id, p_date, x.start_time, x.end_time
  from jsonb_to_recordset(p_windows) as x(start_time time, end_time time);

  delete from public.bookings b
  where b.window_id = any (v_old)
    and not exists (
      select 1 from public.availability_windows w
      where w.week_id = p_week_id
        and w.date = p_date
        and not (w.id = any (v_old))
        and w.start_time <= b.start_time
        and w.end_time >= b.end_time
    );

  update public.bookings b
  set window_id = (
    select w.id from public.availability_windows w
    where w.week_id = p_week_id
      and w.date = p_date
      and not (w.id = any (v_old))
      and w.start_time <= b.start_time
      and w.end_time >= b.end_time
    limit 1
  )
  where b.window_id = any (v_old);

  delete from public.availability_windows w where w.id = any (v_old);
end;
$$;

-- Sustituye la anterior: no se puede pedir la hora a un cliente añadido por Raúl.
create or replace function public.request_swap(
  p_token text,
  p_target_booking_id uuid,
  p_service_id text,
  p_name text,
  p_key_hash text,
  p_cancel_token_hash text
)
returns table (request_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_week public.weeks%rowtype;
  v_target public.bookings%rowtype;
  v_mine public.bookings%rowtype;
  v_has_mine boolean;
  v_name text;
  v_request_id uuid;
begin
  select * into v_week
  from public.weeks w
  where w.public_token = p_token and w.is_active = true;

  if not found then
    raise exception 'LINK_EXPIRED';
  end if;

  if not exists (select 1 from public.services s where s.id = p_service_id) then
    raise exception 'INVALID_SERVICE';
  end if;

  select * into v_target
  from public.bookings b
  where b.id = p_target_booking_id and b.week_id = v_week.id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_target.client_key_hash = p_key_hash then
    raise exception 'CANNOT_REQUEST_OWN';
  end if;

  -- Sin navegador dueño: nadie podría responder a la petición.
  if v_target.created_by_admin then
    raise exception 'CANNOT_REQUEST_MANAGED';
  end if;

  select * into v_mine
  from public.bookings b
  where b.week_id = v_week.id
    and b.slot_date = v_target.slot_date
    and b.client_key_hash = p_key_hash;
  v_has_mine := found;

  if v_has_mine then
    v_name := v_mine.client_name;
  else
    v_name := trim(coalesce(p_name, ''));
    if char_length(v_name) < 1 or char_length(v_name) > 40 then
      raise exception 'INVALID_NAME';
    end if;

    if exists (
      select 1
      from public.bookings b
      where b.week_id = v_week.id
        and b.slot_date = v_target.slot_date
        and b.id <> v_target.id
        and b.client_name_normalized = lower(v_name)
    ) then
      raise exception 'NAME_TAKEN_THAT_DAY';
    end if;
  end if;

  -- Quien pide tiene que caber en la hora pedida…
  if public.swap_slot_fits(
    v_week.id, v_target.slot_date, v_target.start_time, p_service_id,
    array_remove(array[v_target.id, case when v_has_mine then v_mine.id end], null)
  ) is null then
    raise exception 'REQUEST_DOES_NOT_FIT';
  end if;

  -- …y en un intercambio, el dueño en la hora de quien pide.
  if v_has_mine and public.swap_slot_fits(
    v_week.id, v_mine.slot_date, v_mine.start_time, v_target.service_id,
    array[v_target.id, v_mine.id]
  ) is null then
    raise exception 'REQUEST_DOES_NOT_FIT';
  end if;

  begin
    insert into public.swap_requests (
      week_id, target_booking_id, requester_booking_id,
      owner_name, slot_date, start_time, swap_start_time,
      service_id, requester_name, requester_key_hash, requester_cancel_token_hash
    )
    values (
      v_week.id, v_target.id, case when v_has_mine then v_mine.id end,
      v_target.client_name, v_target.slot_date, v_target.start_time,
      case when v_has_mine then v_mine.start_time end,
      p_service_id, v_name, p_key_hash, p_cancel_token_hash
    )
    returning swap_requests.id into v_request_id;
  exception
    when unique_violation then
      raise exception 'REQUEST_ALREADY_PENDING';
  end;

  return query select v_request_id, 'pending'::text;
end;
$$;

revoke all on function public.admin_service_end(text, time) from public;
revoke all on function public.admin_slot_window(uuid, date, time, time, uuid[]) from public;
revoke all on function public.admin_expire_requests(uuid[]) from public;
revoke all on function public.admin_create_booking(uuid, text, text, date, time) from public;
revoke all on function public.admin_update_booking(uuid, text, text, date, time) from public;
revoke all on function public.admin_swap_bookings(uuid, uuid) from public;
revoke all on function public.admin_set_paid(uuid, boolean) from public;
revoke all on function public.admin_move_day(uuid, date, date) from public;

grant execute on function public.admin_create_booking(uuid, text, text, date, time) to service_role;
grant execute on function public.admin_update_booking(uuid, text, text, date, time) to service_role;
grant execute on function public.admin_swap_bookings(uuid, uuid) to service_role;
grant execute on function public.admin_set_paid(uuid, boolean) to service_role;
grant execute on function public.admin_move_day(uuid, date, date) to service_role;
