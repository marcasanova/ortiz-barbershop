-- Token público de 8 hex. gen_random_bytes está en pgcrypto (esquema extensions).
-- Pegar en el SQL Editor de Supabase y Run. Luego Raúl genera un enlace nuevo.

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
