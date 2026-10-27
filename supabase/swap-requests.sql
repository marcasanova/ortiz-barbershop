-- Peticiones de hora entre amigos (intercambio o ceder).
-- Migración aditiva: no cambia ni borra nada de lo que ya existe.
-- Ejecutar una vez en el SQL editor de Supabase (primero en el proyecto de
-- pruebas, luego en producción antes de desplegar el código nuevo).

create table if not exists public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks (id) on delete cascade,
  -- Reserva que se pide. SET NULL: al ceder se borra y la petición tiene que
  -- seguir existiendo para que quien pidió vea el resultado.
  target_booking_id uuid references public.bookings (id) on delete set null,
  -- Reserva de quien pide ese mismo día (si existe, aceptar = intercambio).
  requester_booking_id uuid references public.bookings (id) on delete set null,
  -- Copia de lo pedido en el momento de pedir.
  owner_name text not null,
  slot_date date not null,
  start_time time not null,
  swap_start_time time,
  service_id text not null references public.services (id),
  requester_name text not null,
  requester_key_hash text not null,
  requester_cancel_token_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  resolution text check (resolution in ('swap', 'cede')),
  result_booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists swap_requests_one_pending
  on public.swap_requests (target_booking_id, requester_key_hash)
  where status = 'pending';

create index if not exists swap_requests_week
  on public.swap_requests (week_id, status);

alter table public.swap_requests enable row level security;

-- Si una reserva desaparece (cancelación, admin, franja recortada), las
-- peticiones pendientes que la tocan caducan en vez de quedarse colgando.
create or replace function public.expire_swap_requests_on_booking_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.swap_requests r
  set status = 'expired', resolved_at = now()
  where r.status = 'pending'
    and (r.target_booking_id = old.id or r.requester_booking_id = old.id);
  return old;
end;
$$;

drop trigger if exists bookings_expire_swap_requests on public.bookings;
create trigger bookings_expire_swap_requests
  before delete on public.bookings
  for each row execute function public.expire_swap_requests_on_booking_delete();

-- ¿Cabe un servicio en esa hora? Devuelve la franja o null. Ignora las
-- reservas de p_exclude (las que se van a mover). Solo para uso interno.
create or replace function public.swap_slot_fits(
  p_week_id uuid,
  p_date date,
  p_start time,
  p_service_id text,
  p_exclude uuid[]
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_duration integer;
  v_end time;
  v_window uuid;
begin
  select s.duration_minutes into v_duration
  from public.services s
  where s.id = p_service_id;

  if not found then
    return null;
  end if;

  v_end := p_start + make_interval(mins => v_duration);
  if v_end <= p_start then
    return null;
  end if;

  select w.id into v_window
  from public.availability_windows w
  where w.week_id = p_week_id
    and w.date = p_date
    and w.start_time <= p_start
    and w.end_time >= v_end
  limit 1;

  if v_window is null then
    return null;
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.week_id = p_week_id
      and b.slot_date = p_date
      and not (b.id = any (coalesce(p_exclude, '{}')))
      and b.start_time < v_end
      and b.end_time > p_start
  ) then
    return null;
  end if;

  return v_window;
end;
$$;

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

create or replace function public.respond_swap(
  p_token text,
  p_request_id uuid,
  p_owner_cancel_token_hash text,
  p_accept boolean
)
returns table (
  request_id uuid,
  status text,
  resolution text,
  result_booking_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_request public.swap_requests%rowtype;
  v_week public.weeks%rowtype;
  v_target public.bookings%rowtype;
  v_mine public.bookings%rowtype;
  v_requester_window uuid;
  v_owner_window uuid;
  v_requester_end time;
  v_owner_end time;
  v_result uuid;
begin
  select * into v_request
  from public.swap_requests r
  where r.id = p_request_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_week
  from public.weeks w
  where w.id = v_request.week_id
  for update;

  if v_week.is_active is not true or v_week.public_token is distinct from p_token then
    raise exception 'LINK_EXPIRED';
  end if;

  if v_request.status <> 'pending' or v_request.target_booking_id is null then
    raise exception 'REQUEST_NOT_PENDING';
  end if;

  select * into v_target
  from public.bookings b
  where b.id = v_request.target_booking_id
  for update;

  if v_target.cancel_token_hash is distinct from p_owner_cancel_token_hash then
    raise exception 'FORBIDDEN';
  end if;

  if not p_accept then
    update public.swap_requests r
    set status = 'declined', resolved_at = now()
    where r.id = v_request.id;

    return query select v_request.id, 'declined'::text, null::text, null::uuid;
    return;
  end if;

  -- Mismo bloqueo que book_slot: nadie reserva ese día mientras se mueve todo.
  perform 1
  from public.bookings b
  where b.week_id = v_week.id and b.slot_date = v_target.slot_date
  for update;

  if v_request.requester_booking_id is not null then
    -- Intercambio: cada reserva conserva su id (y sus tokens); solo se mueven
    -- las horas. Quien pide se queda el servicio que pidió.
    select * into v_mine
    from public.bookings b
    where b.id = v_request.requester_booking_id
    for update;

    v_requester_window := public.swap_slot_fits(
      v_week.id, v_target.slot_date, v_target.start_time, v_request.service_id,
      array[v_target.id, v_mine.id]
    );
    v_owner_window := public.swap_slot_fits(
      v_week.id, v_mine.slot_date, v_mine.start_time, v_target.service_id,
      array[v_target.id, v_mine.id]
    );

    v_requester_end := v_target.start_time + make_interval(
      mins => (select s.duration_minutes from public.services s where s.id = v_request.service_id)
    );
    v_owner_end := v_mine.start_time + make_interval(
      mins => (select s.duration_minutes from public.services s where s.id = v_target.service_id)
    );

    if v_requester_window is null
      or v_owner_window is null
      or (v_target.slot_date = v_mine.slot_date
          and v_target.start_time < v_owner_end
          and v_requester_end > v_mine.start_time) then
      raise exception 'REQUEST_DOES_NOT_FIT';
    end if;

    update public.bookings b
    set slot_date = v_target.slot_date,
        start_time = v_target.start_time,
        end_time = v_requester_end,
        window_id = v_requester_window,
        service_id = v_request.service_id
    where b.id = v_mine.id;

    update public.bookings b
    set slot_date = v_mine.slot_date,
        start_time = v_mine.start_time,
        end_time = v_owner_end,
        window_id = v_owner_window
    where b.id = v_target.id;

    update public.swap_requests r
    set status = 'accepted', resolution = 'swap', result_booking_id = v_mine.id,
        resolved_at = now()
    where r.id = v_request.id;

    v_result := v_mine.id;

    update public.swap_requests r
    set status = 'expired', resolved_at = now()
    where r.status = 'pending'
      and r.id <> v_request.id
      and (r.target_booking_id in (v_target.id, v_mine.id)
           or r.requester_booking_id in (v_target.id, v_mine.id));

    return query select v_request.id, 'accepted'::text, 'swap'::text, v_result;
    return;
  end if;

  -- Ceder: el dueño se queda sin hora (podrá reservar otra a mano) y quien
  -- pide entra con el token que guardó al pedir.
  v_requester_window := public.swap_slot_fits(
    v_week.id, v_target.slot_date, v_target.start_time, v_request.service_id,
    array[v_target.id]
  );

  if v_requester_window is null then
    raise exception 'REQUEST_DOES_NOT_FIT';
  end if;

  v_requester_end := v_target.start_time + make_interval(
    mins => (select s.duration_minutes from public.services s where s.id = v_request.service_id)
  );

  -- Primero se marca aceptada, para que el trigger de borrado no la caduque.
  update public.swap_requests r
  set status = 'accepted', resolution = 'cede', resolved_at = now()
  where r.id = v_request.id;

  delete from public.bookings b where b.id = v_target.id;

  begin
    insert into public.bookings (
      week_id, window_id, service_id, slot_date, start_time, end_time,
      client_name, client_key_hash, cancel_token_hash
    )
    values (
      v_week.id, v_requester_window, v_request.service_id, v_target.slot_date,
      v_target.start_time, v_requester_end, v_request.requester_name,
      v_request.requester_key_hash, v_request.requester_cancel_token_hash
    )
    returning bookings.id into v_result;
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

  update public.swap_requests r
  set result_booking_id = v_result
  where r.id = v_request.id;

  return query select v_request.id, 'accepted'::text, 'cede'::text, v_result;
end;
$$;

create or replace function public.cancel_swap_request(
  p_token text,
  p_request_id uuid,
  p_key_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.swap_requests%rowtype;
  v_week public.weeks%rowtype;
begin
  select * into v_request
  from public.swap_requests r
  where r.id = p_request_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_week from public.weeks w where w.id = v_request.week_id;

  if v_week.is_active is not true or v_week.public_token is distinct from p_token then
    raise exception 'LINK_EXPIRED';
  end if;

  if v_request.requester_key_hash is distinct from p_key_hash then
    raise exception 'FORBIDDEN';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'REQUEST_NOT_PENDING';
  end if;

  update public.swap_requests r
  set status = 'cancelled', resolved_at = now()
  where r.id = v_request.id;
end;
$$;

-- Peticiones de este navegador en la semana activa: las que le hacen
-- (pendientes, sobre sus reservas) y las que ha hecho (todas). Sin hashes.
create or replace function public.my_swap_requests(p_token text, p_key_hash text)
returns table (
  request_id uuid,
  role text,
  status text,
  resolution text,
  requester_name text,
  owner_name text,
  slot_date date,
  start_time time,
  swap_start_time time,
  service_id text,
  result_booking_id uuid,
  target_booking_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_week public.weeks%rowtype;
begin
  select * into v_week
  from public.weeks w
  where w.public_token = p_token and w.is_active = true;

  if not found then
    raise exception 'LINK_EXPIRED';
  end if;

  return query
  select r.id, 'incoming'::text, r.status, r.resolution, r.requester_name,
         r.owner_name, r.slot_date, r.start_time, r.swap_start_time,
         r.service_id, r.result_booking_id, r.target_booking_id
  from public.swap_requests r
  join public.bookings b on b.id = r.target_booking_id
  where r.week_id = v_week.id
    and r.status = 'pending'
    and b.client_key_hash = p_key_hash
  union all
  select r.id, 'outgoing'::text, r.status, r.resolution, r.requester_name,
         r.owner_name, r.slot_date, r.start_time, r.swap_start_time,
         r.service_id, r.result_booking_id, r.target_booking_id
  from public.swap_requests r
  where r.week_id = v_week.id
    and r.requester_key_hash = p_key_hash;
end;
$$;

-- Pulso en tiempo real: si existe (enable-realtime.sql), avisa también de
-- cambios en peticiones para que ambos navegadores recarguen.
do $$
begin
  if to_regprocedure('public.touch_board_pulse()') is not null then
    drop trigger if exists swap_requests_touch_pulse on public.swap_requests;
    create trigger swap_requests_touch_pulse
      after insert or update or delete on public.swap_requests
      for each row execute function public.touch_board_pulse();
  end if;
end $$;

revoke all on function public.swap_slot_fits(uuid, date, time, text, uuid[]) from public;
revoke all on function public.request_swap(text, uuid, text, text, text, text) from public;
revoke all on function public.respond_swap(text, uuid, text, boolean) from public;
revoke all on function public.cancel_swap_request(text, uuid, text) from public;
revoke all on function public.my_swap_requests(text, text) from public;

grant execute on function public.request_swap(text, uuid, text, text, text, text) to service_role;
grant execute on function public.respond_swap(text, uuid, text, boolean) to service_role;
grant execute on function public.cancel_swap_request(text, uuid, text) to service_role;
grant execute on function public.my_swap_requests(text, text) to service_role;
