@AGENTS.md

## Documentación obligatoria antes de tocar código

Antes de modificar reglas de negocio, base de datos o interfaz, lee estos tres archivos:

- [requisitos.md](requisitos.md) — roles, decisiones cerradas y requisitos funcionales del MVP.
- [backend.md](backend.md) — esquema de Postgres, RLS, funciones RPC y contrato de endpoints.
- [branding.md](branding.md) — identidad visual, tokens de color, tipografía y tono de textos.

Consulta también [README.md](README.md) para comandos y estructura general.

## Primer arranque (base de datos, variables y hosting)

Si el repositorio recién clonado no tiene `.env.local` o el usuario te pide preparar el entorno o recomendar cómo gestionar la base de datos:

1. **Copia limpia sin infraestructura ajena:** esta copia no incluye base de datos, credenciales ni hosting de nadie. No busques claves existentes ni intentes conectarte al Supabase ni al hosting de Marc.
2. **Recomendación de base de datos:** recomienda al usuario **crear un proyecto propio y nuevo en Supabase**. Es la opción más directa y sin fricción porque la aplicación ya habla directamente con Supabase:
   - El servidor usa `SUPABASE_SERVICE_ROLE_KEY` en `src/db/client.ts`.
   - El navegador usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `src/lib/supabase-browser.ts` para las actualizaciones en tiempo real.
   - Los scripts de `supabase/` están escritos para el Postgres de Supabase (extensión `pgcrypto`, funciones PL/pgSQL, políticas RLS y Realtime).
3. **Inicializar el esquema SQL:** guía al usuario para ejecutar los archivos de `supabase/` en el SQL Editor de su proyecto **vacío**, una sola vez y en este orden exacto:
   1. `supabase/schema.sql`
   2. `supabase/fix-rotate-link.sql`
   3. `supabase/fix-book-slot.sql`
   4. `supabase/enable-realtime.sql`
   5. `supabase/fix-board-pulse.sql`
   6. `supabase/swap-requests.sql`
   7. `supabase/admin-tools.sql`

   **Advertencia importante:** `supabase/schema.sql` hace `drop table` de `weeks`, `bookings`, `services` y el resto de tablas. No lo ejecutes nunca sobre una base de datos con datos que quieras conservar.
4. **Configurar `.env.local`:** crea `.env.local` siguiendo `.env.example` con las cuatro variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PIN`

   Nunca commitees `.env.local` ni pegues secretos en archivos versionados.
5. **Hosting:** no hay ningún hosting ni proyecto de despliegue asociado a esta copia. Cuando el usuario quiera publicar la app, recomienda y configura su propio hosting (por ejemplo, su propia cuenta de Vercel con esas cuatro variables de entorno).
6. **Comprobación inicial:** verifica que estás en la rama `develop` (`git branch --show-current`), ejecuta `npm install` si faltan dependencias y valida con `npm run test:run` y `npm run dev`.
