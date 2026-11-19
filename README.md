# Ortiz Barbershop

App web de reservas para **Ortiz Barbershop**: sin registro de clientes, pensada para abrirse desde un enlace de WhatsApp, con panel de administración protegido por PIN para Raúl.

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres + Realtime) y Vitest.
- **Rutas principales:**
  - `/s/[token]` — tablero público de reservas para amigos.
  - `/admin` — panel de Raúl (acceso con `ADMIN_PIN`).

## Rama de trabajo

Trabaja siempre sobre la rama `develop`. La rama por defecto en GitHub es `main` (producción) y puede ir por detrás de `develop`:

```bash
git clone -b develop https://github.com/marcasanova/ortiz-barbershop.git
cd ortiz-barbershop
```

Consulta las reglas de ramas y de Next.js en [AGENTS.md](AGENTS.md).

## Base de datos y hosting

Este repositorio **no incluye base de datos, credenciales ni hosting**. Si clonas el proyecto para desarrollar o montar tu propia instancia, crea tu propio proyecto de Supabase (y elige tu propio hosting cuando quieras publicar).

## Puesta en marcha en local

### 1. Requisitos

- Node.js `20.9+` y `npm`
- Un proyecto nuevo y vacío de [Supabase](https://supabase.com)

### 2. Instalar dependencias

```bash
npm install
```

### 3. Preparar la base de datos (Supabase)

Ejecuta los archivos SQL de `supabase/` en el **SQL Editor** de tu proyecto de Supabase, **una sola vez y exactamente en este orden**:

1. `supabase/schema.sql`
2. `supabase/fix-rotate-link.sql`
3. `supabase/fix-book-slot.sql`
4. `supabase/enable-realtime.sql`
5. `supabase/fix-board-pulse.sql`
6. `supabase/swap-requests.sql`
7. `supabase/admin-tools.sql`

> **Aviso:** ejecuta esto solo sobre un proyecto vacío. `supabase/schema.sql` hace `drop table` de `weeks`, `bookings`, `services`, `availability_windows` y el resto de tablas: si lo lanzas en una base con datos, los borra.

### 4. Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores de tu proyecto de Supabase y el PIN que quieras para `/admin`:

```bash
cp .env.example .env.local
```

Variables requeridas (sin valores en el repo):

- `NEXT_PUBLIC_SUPABASE_URL` — URL de tu proyecto de Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave pública (`anon`) de tu proyecto, usada por el navegador para suscribirse al tiempo real (`src/lib/supabase-browser.ts`).
- `SUPABASE_SERVICE_ROLE_KEY` — clave privada (`service_role`), usada solo en el servidor (`src/db/client.ts`). Nunca la expongas ni la subas a Git.
- `ADMIN_PIN` — PIN de acceso al panel `/admin`.

`.env.local` está ignorado por Git y no debe commitearse nunca.

### 5. Arrancar el servidor de desarrollo

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Arranca Next.js en modo desarrollo (`http://localhost:3000`). |
| `npm run build` | Compila la aplicación para producción. |
| `npm run start` | Arranca la compilación de producción. |
| `npm run lint` | Ejecuta ESLint. |
| `npm test` | Ejecuta los tests unitarios con Vitest en modo watch. |
| `npm run test:run` | Ejecuta los tests unitarios una vez. |
| `npm run test:integration` | Ejecuta los tests de integración contra la base de datos configurada en `.env.local`. |

## Documentación del proyecto

- [requisitos.md](requisitos.md) — roles, reglas de negocio y requisitos funcionales del MVP.
- [backend.md](backend.md) — esquema de tablas, RLS, funciones SQL y contrato de endpoints.
- [branding.md](branding.md) — identidad visual, paleta neón, tipografía y tono de textos.
- [AGENTS.md](AGENTS.md) — reglas de ramas y avisos de Next.js 16.
- [CLAUDE.md](CLAUDE.md) — instrucciones de contexto y primer arranque para Claude Code.
