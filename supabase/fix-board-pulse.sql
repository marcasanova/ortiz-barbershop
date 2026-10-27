-- Arreglo: borrar una semana fallaba si el tiempo real estaba activo.
-- Al borrar la semana, Postgres borra en cascada sus franjas y reservas, y
-- su trigger intentaba crear un pulso para esa misma semana (que ya no
-- existe) → violación de clave foránea → se deshacía el borrado entero.
-- Ahora solo se avisa si la semana sigue existiendo.

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
